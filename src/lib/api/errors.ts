export type ApiErrorCode =
  | 'configuration'
  | 'network'
  | 'timeout'
  | 'unauthorized'
  | 'notFound'
  | 'expired'
  | 'rateLimited'
  | 'invalidResponse'
  | 'server';
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status?: number;
  readonly requestId?: string;
  constructor(code: ApiErrorCode, status?: number, requestId?: string) {
    super(code);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.requestId = requestId?.slice(0, 100);
  }
}
export function isAbort(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}
export function errorCode(error: unknown): ApiErrorCode {
  return error instanceof ApiError ? error.code : 'server';
}
