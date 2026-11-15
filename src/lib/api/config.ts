import { ApiError } from './errors.ts';
export interface ApiConfig {
  baseUrl: string;
  airportsPath: string;
  searchPath: string;
  offerPath: string;
  searchMethod: 'GET' | 'POST';
  credentials: RequestCredentials;
  defaultCurrency: string;
  timeoutMs: number;
}
export function apiConfig(values: Record<string, string | undefined>): ApiConfig {
  return {
    baseUrl: values.PUBLIC_API_BASE_URL?.trim() ?? '',
    airportsPath: values.PUBLIC_API_AIRPORTS_PATH?.trim() ?? '',
    searchPath: values.PUBLIC_API_SEARCH_PATH?.trim() ?? '',
    offerPath: values.PUBLIC_API_OFFER_PATH?.trim() ?? '',
    searchMethod: values.PUBLIC_API_SEARCH_METHOD === 'POST' ? 'POST' : 'GET',
    credentials:
      values.PUBLIC_API_CREDENTIALS === 'include'
        ? 'include'
        : values.PUBLIC_API_CREDENTIALS === 'omit'
          ? 'omit'
          : 'same-origin',
    defaultCurrency: /^[A-Z]{3}$/.test(values.PUBLIC_DEFAULT_CURRENCY ?? '')
      ? values.PUBLIC_DEFAULT_CURRENCY!
      : 'USD',
    timeoutMs: 12000,
  };
}
/** Prevent protocol-relative URLs, credentials in URLs, and path traversal. */
export function endpointUrl(base: string, path: string, origin: string): URL {
  if (!base || !path || !path.startsWith('/') || path.startsWith('//') || /[?#\\]/.test(path))
    throw new ApiError('configuration');
  let decoded: string;
  try {
    decoded = decodeURIComponent(path);
  } catch {
    throw new ApiError('configuration');
  }
  if (
    decoded.includes('..') ||
    decoded.includes('://') ||
    decoded.includes('\\') ||
    decoded.startsWith('//')
  )
    throw new ApiError('configuration');
  let url: URL;
  try {
    url = new URL(base.endsWith('/') ? base : `${base}/`, origin);
  } catch {
    throw new ApiError('configuration');
  }
  if (url.username || url.password || url.hash || url.search) throw new ApiError('configuration');
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local))
    throw new ApiError('configuration');
  return new URL(path.slice(1), url);
}
export function configured(
  config: ApiConfig,
  capability: 'airports' | 'search' | 'offer',
): boolean {
  const path =
    capability === 'airports'
      ? config.airportsPath
      : capability === 'search'
        ? config.searchPath
        : config.offerPath;
  if (capability === 'offer' && !path.includes('{id}')) return false;
  try {
    endpointUrl(config.baseUrl, path.replace('{id}', 'validation'), 'https://frontend.invalid');
    return true;
  } catch {
    return false;
  }
}
