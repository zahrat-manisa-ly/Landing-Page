import { endpointUrl, type ApiConfig } from './config.ts';
import { ApiError } from './errors.ts';
export type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
export interface RequestOptions {
  signal?: AbortSignal;
  method?: 'GET' | 'POST';
  query?: URLSearchParams;
  body?: unknown;
  locale?: string;
}
export function createApiClient(
  config: ApiConfig,
  fetcher: Fetcher = fetch,
  origin = 'https://frontend.invalid',
) {
  return {
    async request(path: string, options: RequestOptions = {}): Promise<unknown> {
      const url = endpointUrl(config.baseUrl, path, origin);
      if (options.query) url.search = options.query.toString();
      const controller = new AbortController();
      let timedOut = false;
      const onAbort = () => controller.abort(options.signal?.reason);
      if (options.signal?.aborted) onAbort();
      else options.signal?.addEventListener('abort', onAbort, { once: true });
      const timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, config.timeoutMs);
      try {
        const response = await fetcher(url, {
          method: options.method ?? 'GET',
          signal: controller.signal,
          credentials: config.credentials,
          cache: 'no-store',
          redirect: 'error',
          headers: {
            Accept: 'application/json',
            'Accept-Language': options.locale ?? 'en',
            ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
          },
          ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
        });
        if (!response.ok) {
          const status = response.status;
          const code =
            status === 401 || status === 403
              ? 'unauthorized'
              : status === 404
                ? 'notFound'
                : status === 409 || status === 410
                  ? 'expired'
                  : status === 429
                    ? 'rateLimited'
                    : 'server';
          // Do not expose raw server bodies, stack traces, or passenger data.
          throw new ApiError(code, status, response.headers.get('x-request-id') ?? undefined);
        }
        if (!response.headers.get('content-type')?.toLowerCase().includes('json'))
          throw new ApiError('invalidResponse');
        let payload: unknown;
        try {
          payload = await response.json();
        } catch {
          throw new ApiError('invalidResponse');
        }
        return payload;
      } catch (error) {
        if (options.signal?.aborted) throw new DOMException('Request cancelled', 'AbortError');
        if (timedOut) throw new ApiError('timeout');
        if (error instanceof ApiError) throw error;
        throw new ApiError('network');
      } finally {
        clearTimeout(timer);
        options.signal?.removeEventListener('abort', onAbort);
      }
    },
  };
}
