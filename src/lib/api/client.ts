import { POKEAPI_BASE_URL } from "@/constants/app";
import { ApiError, NotFoundError } from "./errors";

const REQUEST_TIMEOUT_MS = 15_000;
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

export interface FetchJsonOptions {
  /** Number of retries for network failures and transient HTTP errors. */
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

/**
 * Fetches JSON from PokéAPI. Throws `NotFoundError` for 404, `ApiError` for other
 * failures. Response bodies are returned as `unknown` and must be parsed.
 */
export async function fetchJson(
  pathOrUrl: string,
  { retries = 1, fetchImpl = fetch }: FetchJsonOptions = {},
): Promise<unknown> {
  const url = resolveApiUrl(pathOrUrl);
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    let response: Response;
    try {
      response = await fetchImpl(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      lastError = new ApiError(
        `Network error while requesting ${url}: ${error instanceof Error ? error.message : String(error)}`,
        url,
      );
      continue;
    }

    if (response.status === 404) throw new NotFoundError(url);

    if (!response.ok) {
      lastError = new ApiError(`PokéAPI responded with ${response.status} for ${url}`, url, response.status);
      if (RETRYABLE_STATUS.has(response.status)) continue;
      throw lastError;
    }

    try {
      return await response.json();
    } catch {
      throw new ApiError(`PokéAPI returned invalid JSON for ${url}`, url, response.status);
    }
  }

  throw lastError instanceof Error ? lastError : new ApiError(`Request failed: ${url}`, url);
}
