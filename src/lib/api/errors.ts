/** Raised when PokéAPI responds with a non-success status other than 404. */
export class ApiError extends Error {
  readonly status: number | null;
  readonly url: string;

  constructor(message: string, url: string, status: number | null = null) {
    super(message);
    this.name = "ApiError";
    this.url = url;
    this.status = status;
  }
}

/** Raised when PokéAPI responds with 404 for the requested resource. */
export class NotFoundError extends ApiError {
  constructor(url: string) {
    super(`Resource not found: ${url}`, url, 404);
    this.name = "NotFoundError";
  }
}

/** Raised when a response does not match the shape the app depends on. */
export class ApiParseError extends Error {
  readonly path: string;

  constructor(path: string, expected: string) {
    super(`Invalid PokéAPI response at "${path}": expected ${expected}`);
    this.name = "ApiParseError";
    this.path = path;
  }
}
