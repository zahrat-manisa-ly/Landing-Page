import { test } from 'node:test';
import assert from 'node:assert/strict';
import { apiConfig, configured, endpointUrl } from '../../src/lib/api/config.ts';
import { createApiClient, type Fetcher } from '../../src/lib/api/client.ts';
import { backendAdapter, parseAirport, parseMoney, parseOffer } from '../../src/lib/api/adapter.ts';
import { ApiError, isAbort } from '../../src/lib/api/errors.ts';
import { flightService } from '../../src/lib/api/flights.ts';
import { offer, origin, validSearch, searchPayload } from '../fixtures/flights.ts';
const config = {
  ...apiConfig({
    PUBLIC_API_BASE_URL: 'https://api.example.test/v1',
    PUBLIC_API_AIRPORTS_PATH: '/airports',
    PUBLIC_API_SEARCH_PATH: '/search',
    PUBLIC_API_OFFER_PATH: '/offers/{id}',
  }),
  timeoutMs: 100,
};
const json = (value: unknown) =>
  new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } });
const isCode = (code: string) => (error: unknown) =>
  error instanceof ApiError && error.code === code;
test('blank endpoints are explicitly unconfigured', () =>
  assert.equal(configured(apiConfig({}), 'search'), false));
test('base URL path prefix is preserved', () =>
  assert.equal(
    endpointUrl(config.baseUrl, '/search', 'https://web.example.test').href,
    'https://api.example.test/v1/search',
  ));
test('same-origin relative base is supported', () =>
  assert.equal(
    endpointUrl('/api', '/search', 'https://web.example.test').href,
    'https://web.example.test/api/search',
  ));
test('insecure non-local backend is rejected', () =>
  assert.throws(
    () => endpointUrl('http://api.example.test', '/search', 'https://web.example.test'),
    isCode('configuration'),
  ));
test('localhost HTTP is allowed for development', () =>
  assert.equal(
    endpointUrl('http://localhost:9000', '/search', 'http://localhost:4321').origin,
    'http://localhost:9000',
  ));
test('URL credentials and protocol-relative endpoint paths are rejected', () => {
  assert.throws(() =>
    endpointUrl('https://secret@api.example.test', '/search', 'https://web.example.test'),
  );
  assert.throws(() => endpointUrl(config.baseUrl, '//evil.example', 'https://web.example.test'));
});
test('raw and encoded traversal is rejected', () => {
  for (const path of ['/../secret', '/%2e%2e/secret', '/bad\\path'])
    assert.throws(() => endpointUrl(config.baseUrl, path, 'https://web.example.test'));
});
test('no request is made when API is unconfigured', async () => {
  let calls = 0;
  const service = flightService(apiConfig({}), 'en', async () => {
    calls++;
    return json({});
  });
  await assert.rejects(service.search(validSearch), isCode('configuration'));
  assert.equal(calls, 0);
});
test('valid normalized airport response is accepted', () =>
  assert.deepEqual(backendAdapter.airports({ airports: [origin, origin] }), [origin]));
test('invalid airport timezone is rejected', () =>
  assert.throws(
    () => parseAirport({ ...origin, timeZone: 'Not/AZone' }),
    isCode('invalidResponse'),
  ));
test('minor units must be safe nonnegative integers', () => {
  for (const amountMinor of [-1, 0.1, Infinity, Number.MAX_SAFE_INTEGER + 1])
    assert.throws(
      () => parseMoney({ amountMinor, currency: 'USD', decimals: 2 }),
      isCode('invalidResponse'),
    );
});
test('missing price is not replaced with a zero price', () =>
  assert.throws(() => parseOffer({ ...offer(), price: undefined }), isCode('invalidResponse')));
test('valid offer is accepted without invented defaults', () =>
  assert.deepEqual(parseOffer(offer()), offer()));
test('missing authoritative availability is rejected', () =>
  assert.throws(
    () => parseOffer({ ...offer(), availability: undefined }),
    isCode('invalidResponse'),
  ));
test('unknown response envelopes are rejected', () =>
  assert.throws(() => backendAdapter.search({ data: searchPayload() }), isCode('invalidResponse')));
test('duplicate offers are rejected', () =>
  assert.throws(
    () => backendAdapter.search({ offers: [offer(), offer()], total: 2, nextCursor: null }),
    isCode('invalidResponse'),
  ));
test('invalid total count is rejected', () =>
  assert.throws(
    () => backendAdapter.search({ ...searchPayload(), total: 0 }),
    isCode('invalidResponse'),
  ));
test('arrival before departure is rejected', () => {
  const item = offer();
  item.journeys[0]!.segments[0]!.arrivalAt = '2029-01-01T00:00:00Z';
  assert.throws(() => parseOffer(item), isCode('invalidResponse'));
});
test('timestamp without timezone is rejected', () =>
  assert.throws(
    () => parseOffer({ ...offer(), expiresAt: '2030-01-01T12:00:00' }),
    isCode('invalidResponse'),
  ));
test('mixed currency within offer fare choices is rejected', () => {
  const item = offer();
  item.fares[0]!.price = { amountMinor: 100, currency: 'EUR', decimals: 2 };
  assert.throws(() => parseOffer(item), isCode('invalidResponse'));
});
test('request headers, credential policy and query mapping are explicit', async () => {
  let seenUrl = '',
    seen: RequestInit | undefined;
  const client = createApiClient(config, async (url, init) => {
    seenUrl = String(url);
    seen = init;
    return json({ ok: true });
  });
  assert.deepEqual(
    await client.request('/search', { locale: 'ar', query: new URLSearchParams({ from: 'AAA' }) }),
    { ok: true },
  );
  assert.equal(new URL(seenUrl).searchParams.get('from'), 'AAA');
  assert.equal(seen?.credentials, 'same-origin');
  assert.equal(seen?.cache, 'no-store');
  assert.equal((seen?.headers as Record<string, string>)['Accept-Language'], 'ar');
});
for (const [status, code] of [
  [401, 'unauthorized'],
  [403, 'unauthorized'],
  [404, 'notFound'],
  [409, 'expired'],
  [410, 'expired'],
  [429, 'rateLimited'],
  [500, 'server'],
] as const) {
  test(`HTTP ${status} maps to a sanitized ${code} error`, async () => {
    const client = createApiClient(
      config,
      async () => new Response('secret backend body', { status }),
    );
    await assert.rejects(
      client.request('/search'),
      (e) => isCode(code)(e) && !(e as Error).message.includes('secret'),
    );
  });
}
test('HTML response is not treated as inventory', async () => {
  const client = createApiClient(
    config,
    async () => new Response('<html>error</html>', { headers: { 'Content-Type': 'text/html' } }),
  );
  await assert.rejects(client.request('/search'), isCode('invalidResponse'));
});
test('malformed JSON is rejected', async () => {
  const client = createApiClient(
    config,
    async () => new Response('{bad', { headers: { 'Content-Type': 'application/json' } }),
  );
  await assert.rejects(client.request('/search'), isCode('invalidResponse'));
});
test('network errors are surfaced without sample inventory', async () => {
  const client = createApiClient(config, async () => {
    throw new Error('DNS failed');
  });
  await assert.rejects(client.request('/search'), isCode('network'));
});
const pending: Fetcher = async (_url, init) =>
  new Promise((_resolve, reject) => {
    if (init?.signal?.aborted) {
      reject(new DOMException('cancelled', 'AbortError'));
      return;
    }
    init?.signal?.addEventListener(
      'abort',
      () => reject(new DOMException('cancelled', 'AbortError')),
      { once: true },
    );
  });
test('request timeout is distinct from cancellation', async () => {
  const client = createApiClient({ ...config, timeoutMs: 10 }, pending);
  await assert.rejects(client.request('/search'), isCode('timeout'));
});
test('external cancellation remains AbortError', async () => {
  const controller = new AbortController();
  const promise = createApiClient(config, pending).request('/search', {
    signal: controller.signal,
  });
  controller.abort();
  await assert.rejects(promise, isAbort);
});
test('pre-aborted signal is respected', async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    createApiClient(config, pending).request('/search', { signal: controller.signal }),
    isAbort,
  );
});
test('failed request is not automatically retried', async () => {
  let calls = 0;
  const client = createApiClient(config, async () => {
    calls++;
    return new Response('', { status: 503 });
  });
  await assert.rejects(client.request('/search'));
  assert.equal(calls, 1);
});
test('GET search follows adapter query mapping', async () => {
  let url = '';
  const service = flightService(config, 'en', async (input) => {
    url = String(input);
    return json(searchPayload());
  });
  await service.search(validSearch);
  assert.equal(new URL(url).searchParams.get('adults'), '1');
  assert.equal(new URL(url).searchParams.get('from'), 'AAA');
});
test('POST search has JSON body and no implicit retry', async () => {
  let init: RequestInit | undefined;
  const service = flightService(
    { ...config, searchMethod: 'POST' },
    'en',
    async (_url, options) => {
      init = options;
      return json(searchPayload());
    },
  );
  await service.search(validSearch);
  assert.equal(init?.method, 'POST');
  assert.equal(JSON.parse(String(init?.body)).from, 'AAA');
});
test('search rejects response prices in an unexpected currency', async () => {
  const item = offer({ price: { amountMinor: 100, currency: 'EUR', decimals: 2 }, fares: [] });
  const service = flightService(config, 'en', async () => json(searchPayload([item])));
  await assert.rejects(service.search(validSearch), isCode('invalidResponse'));
});
test('offer identifier must match the requested offer', async () => {
  const service = flightService(config, 'en', async () => json({ offer: offer() }));
  await assert.rejects(service.offer('some-other-id'), isCode('invalidResponse'));
});
test('impossible calendar dates in timestamps are rejected', () =>
  assert.throws(
    () => parseOffer({ ...offer(), expiresAt: '2030-02-30T00:00:00Z' }),
    isCode('invalidResponse'),
  ));
test('duplicate journey identifiers are rejected', () => {
  const item = offer();
  item.journeys.push(structuredClone(item.journeys[0]!));
  assert.throws(() => parseOffer(item), isCode('invalidResponse'));
});
test('duplicate segment identifiers are rejected', () => {
  const item = offer();
  const segment = structuredClone(item.journeys[0]!.segments[0]!);
  segment.departureAt = '2030-11-18T13:00:00+03:00';
  segment.arrivalAt = '2030-11-18T16:00:00+03:00';
  item.journeys[0]!.segments.push(segment);
  assert.throws(() => parseOffer(item), isCode('invalidResponse'));
});
test('hour 24 is rejected by the RFC3339 view contract', () =>
  assert.throws(
    () => parseOffer({ ...offer(), expiresAt: '2030-01-01T24:00:00Z' }),
    isCode('invalidResponse'),
  ));
test('non-string cabin value yields a contract error', () =>
  assert.throws(
    () => parseOffer({ ...offer(), cabin: { toString: null } }),
    isCode('invalidResponse'),
  ));
