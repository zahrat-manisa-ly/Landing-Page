import type { FlightSearch, Locale } from '../domain/types.ts';
import { backendAdapter } from './adapter.ts';
import { createApiClient, type Fetcher } from './client.ts';
import { configured, type ApiConfig } from './config.ts';
import { ApiError } from './errors.ts';
export function flightService(
  config: ApiConfig,
  locale: Locale,
  fetcher: Fetcher = fetch,
  origin = typeof window === 'undefined' ? 'https://frontend.invalid' : window.location.origin,
) {
  const client = createApiClient(config, fetcher, origin);
  return {
    async airports(query: string, signal?: AbortSignal) {
      if (!configured(config, 'airports')) throw new ApiError('configuration');
      return backendAdapter.airports(
        await client.request(config.airportsPath, {
          query: backendAdapter.airportQuery(query),
          signal,
          locale,
        }),
      );
    },
    async search(search: FlightSearch, signal?: AbortSignal, cursor?: string) {
      if (!configured(config, 'search')) throw new ApiError('configuration');
      const payload = await client.request(config.searchPath, {
        method: config.searchMethod,
        signal,
        locale,
        ...(config.searchMethod === 'GET'
          ? { query: backendAdapter.searchQuery(search, cursor) }
          : { body: backendAdapter.searchBody(search, cursor) }),
      });
      const response = backendAdapter.search(payload);
      if (response.offers.some((o) => o.price.currency !== search.currency))
        throw new ApiError('invalidResponse');
      return response;
    },
    async offer(id: string, signal?: AbortSignal) {
      if (!configured(config, 'offer') || !id || id.length > 200 || id === '.' || id === '..')
        throw new ApiError('configuration');
      const offer = backendAdapter.offer(
        await client.request(config.offerPath.replace('{id}', encodeURIComponent(id)), {
          signal,
          locale,
        }),
      );
      if (offer.id !== id) throw new ApiError('invalidResponse');
      return offer;
    },
  };
}
