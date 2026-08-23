import { ApiError, type ApiErrorBody } from "./types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
  headers?: Record<string, string>;
  /** Internal — set on the retried call after a refresh, to stop a second
   * 401 from looping back into another refresh attempt. */
  skipAuthRetry?: boolean;
}

function newRequestId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `req_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

let inFlightRefresh: Promise<boolean> | null = null;

/** Concurrent 401s share one refresh call instead of each racing to rotate
 * the refresh cookie — not a full mutex, but removes the common case. */
function refreshSession(): Promise<boolean> {
  if (!inFlightRefresh) {
    inFlightRefresh = fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { "X-Request-Id": newRequestId() },
    })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        inFlightRefresh = null;
      });
  }
  return inFlightRefresh;
}

/**
 * Thin fetch wrapper for the Healthy API.
 *
 * Session tokens are never handled here for the patient session: the
 * backend issues short-lived access + rotating refresh tokens as httpOnly
 * Secure cookies, so the browser attaches them automatically via
 * `credentials: "include"`. This client never reads or stores that token
 * itself (§106/§136 — no auth tokens in localStorage). A recipient's share
 * access token is a different, lower-trust credential (§43) — callers pass
 * it explicitly via `options.headers.Authorization`, never a cookie.
 *
 * On a 401 (access token expired mid-session), this transparently calls
 * /auth/refresh once and retries the original request — callers don't see
 * the expiry unless the refresh token itself is also gone.
 */
async function handleResponse<T>(
  response: Response,
  requestId: string,
  path: string,
  options: RequestOptions,
  retry: (nextOptions: RequestOptions) => Promise<T>,
): Promise<T> {
  if (
    response.status === 401 &&
    !options.skipAuthRetry &&
    path !== "/auth/refresh" &&
    !path.startsWith("/share/")
  ) {
    const refreshed = await refreshSession();
    if (refreshed) {
      return retry({ ...options, skipAuthRetry: true });
    }
  }

  if (response.status === 204) {
    return undefined as T;
  }

  let parsed: unknown;
  try {
    parsed = await response.json();
  } catch {
    parsed = null;
  }

  if (!response.ok) {
    const body: ApiErrorBody =
      parsed && typeof parsed === "object" && "error" in parsed
        ? (parsed as ApiErrorBody)
        : {
            error: {
              code: "UNKNOWN_ERROR",
              message: "Something went wrong. Please try again.",
              requestId,
            },
          };
    throw new ApiError(response.status, body);
  }

  return parsed as T;
}

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const requestId = newRequestId();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    credentials: "include",
    signal: options.signal,
    headers: {
      "Content-Type": "application/json",
      "X-Request-Id": requestId,
      ...options.headers,
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  return handleResponse<T>(response, requestId, path, options, (next) => apiFetch<T>(path, next));
}

/**
 * Multipart file upload — separate from apiFetch because that always
 * JSON-stringifies the body and forces Content-Type: application/json,
 * neither of which works for a file. Shares the same credentials/401-retry/
 * error-parsing behavior.
 */
export async function apiUpload<T>(
  path: string,
  formData: FormData,
  options: Pick<RequestOptions, "signal" | "skipAuthRetry"> = {},
): Promise<T> {
  const requestId = newRequestId();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    credentials: "include",
    signal: options.signal,
    headers: { "X-Request-Id": requestId },
    body: formData,
  });

  return handleResponse<T>(response, requestId, path, options, (next) =>
    apiUpload<T>(path, formData, next),
  );
}
