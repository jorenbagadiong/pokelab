import { POKEAPI_BASE_URL } from "@/constants/app";
import { ApiError, NotFoundError } from "./errors";

/**
 * Per-attempt timeout. Under bursty load PokéAPI occasionally leaves a request
 * hanging, so it is better to give up quickly and retry than to wait long.
 */
const REQUEST_TIMEOUT_MS = 8_000;
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const BACKOFF_BASE_MS = 400;
const MAX_RETRY_AFTER_MS = 5_000;
/** In-flight requests per process, in line with PokéAPI's fair-use policy. */
const MAX_CONCURRENT_REQUESTS = 8;

export interface FetchJsonOptions {
  /** Number of retries for network failures, timeouts and transient HTTP errors. */
  retries?: number;
  fetchImpl?: typeof fetch;
}

/** Resolves a PokéAPI path (`/pokemon/1`) or absolute PokéAPI URL to an absolute URL. */
export function resolveApiUrl(pathOrUrl: string): string {
  if (/^https?:\/\//.test(pathOrUrl)) {
    if (!pathOrUrl.startsWith(POKEAPI_BASE_URL)) {
      throw new ApiError(`Refusing to fetch non-PokéAPI URL: ${pathOrUrl}`, pathOrUrl);
    }
    return pathOrUrl;
  }
  return `${POKEAPI_BASE_URL}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}

/** Minimal FIFO semaphore limiting concurrent requests. */
function createLimiter(max: number) {
  let active = 0;
  const queue: (() => void)[] = [];
  return async function run<T>(task: () => Promise<T>): Promise<T> {
    if (active >= max) await new Promise<void>((resolve) => queue.push(resolve));
    active++;
    try {
      return await task();
    } finally {
      active--;
      queue.shift()?.();
    }
  };
}

const limit = createLimiter(MAX_CONCURRENT_REQUESTS);

/** Carries a 429 response's `Retry-After` value to the next attempt. */
class RetryAfter {
  constructor(
    readonly error: ApiError,
    readonly value: string | null,
  ) {}
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Exponential backoff with jitter; honours a (capped) `Retry-After` header. */
export function retryDelay(attempt: number, retryAfter: string | null = null): number {
  const seconds = retryAfter ? Number(retryAfter) : Number.NaN;
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds * 1000, MAX_RETRY_AFTER_MS);
  return BACKOFF_BASE_MS * 2 ** attempt + Math.random() * BACKOFF_BASE_MS;
}

/**
 * Fetches JSON from PokéAPI. Throws `NotFoundError` for 404 and `ApiError` for
 * other failures, after retrying transient ones. Bodies are returned as
 * `unknown` and must be parsed.
 */
export async function fetchJson(
  pathOrUrl: string,
  { retries = 2, fetchImpl = fetch }: FetchJsonOptions = {},
): Promise<unknown> {
  const url = resolveApiUrl(pathOrUrl);
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) await sleep(retryDelay(attempt - 1, lastError instanceof RetryAfter ? lastError.value : null));

    let response: Response;
    let body: string;
    try {
      // The timeout covers both the response headers and reading the body.
      ({ response, body } = await limit(async () => {
        const res = await fetchImpl(url, {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
        return { response: res, body: res.ok ? await res.text() : "" };
      }));
    } catch (error) {
      lastError = new ApiError(
        `Network error while requesting ${url}: ${error instanceof Error ? error.message : String(error)}`,
        url,
      );
      continue;
    }

    if (response.status === 404) throw new NotFoundError(url);

    if (!response.ok) {
      const error = new ApiError(`PokéAPI responded with ${response.status} for ${url}`, url, response.status);
      if (!RETRYABLE_STATUS.has(response.status)) throw error;
      lastError = response.status === 429 ? new RetryAfter(error, response.headers.get("retry-after")) : error;
      continue;
    }

    try {
      return JSON.parse(body);
    } catch {
      throw new ApiError(`PokéAPI returned invalid JSON for ${url}`, url, response.status);
    }
  }

  if (lastError instanceof RetryAfter) throw lastError.error;
  throw lastError instanceof Error ? lastError : new ApiError(`Request failed: ${url}`, url);
}
