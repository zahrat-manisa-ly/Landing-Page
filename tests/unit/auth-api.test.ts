import assert from 'node:assert/strict';
import { test } from 'node:test';
import { QueryClient } from '@tanstack/react-query';
import { createAuthApi, type AuthApi } from '../../src/lib/api/auth/client.ts';
import { createAuthContracts, authKeys } from '../../src/lib/api/auth/queries.ts';
import { getQueryClient } from '../../src/lib/api/auth/query-client.ts';
import { createAccessTokenVault } from '../../src/lib/api/auth/token-vault.ts';
import type { LoginTransition } from '../../src/lib/api/auth/types.ts';
import { ApiError } from '../../src/lib/api/errors.ts';

const user = {
  id: '2d61fca8-a1eb-4fe3-9868-02cfac61b5d7',
  username: null,
  occupation: null,
  employee_id: null,
  email: 'traveler@example.test',
  phone_number: null,
  first_name: 'Test',
  last_name: 'Traveler',
  created_at: '2030-01-01T00:00:00Z',
  updated_at: '2030-01-01T00:00:00Z',
  date_of_birth: null,
  image: null,
  account_type: 'customer' as const,
  is_owner: false,
  is_blocked: false,
  roles: [],
  permissions: [],
};

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json', 'x-request-id': 'request-1' },
  });
}

function path(request: Request): string {
  return new URL(request.url).pathname;
}

function isCode(code: string) {
  return (error: unknown) => error instanceof ApiError && error.code === code;
}

test('access token vault is memory-only and observable', () => {
  const vault = createAccessTokenVault();
  let changes = 0;
  const unsubscribe = vault.subscribe(() => changes++);
  assert.equal(vault.get(), null);
  vault.set('access-one');
  assert.equal(vault.get(), 'access-one');
  vault.clear();
  unsubscribe();
  assert.equal(vault.get(), null);
  assert.equal(changes, 2);
});

test('session bootstrap refreshes with credentials and returns no token', async () => {
  const requests: Request[] = [];
  const api = createAuthApi({
    baseUrl: 'https://api.example.test',
    vault: createAccessTokenVault(),
    fetcher: async (request) => {
      requests.push(request);
      if (path(request) === '/api/v1/auth/refresh')
        return json({ access_token: 'fresh', token_type: 'bearer' });
      assert.equal(request.headers.get('authorization'), 'Bearer fresh');
      return json(user);
    },
  });

  const session = await api.session();
  assert.deepEqual(session, { kind: 'authenticated', user });
  assert.equal(requests[0]?.credentials, 'include');
  assert.equal(requests[0]?.cache, 'no-store');
  assert.equal(requests[0]?.redirect, 'error');
  assert.equal(JSON.stringify(session).includes('fresh'), false);
});

test('concurrent protected requests share one refresh operation', async () => {
  let refreshes = 0;
  const api = createAuthApi({
    baseUrl: 'https://api.example.test',
    vault: createAccessTokenVault(),
    fetcher: async (request) => {
      if (path(request) === '/api/v1/auth/refresh') {
        refreshes++;
        await Promise.resolve();
        return json({ access_token: 'shared', token_type: 'bearer' });
      }
      return json(user);
    },
  });

  await Promise.all([api.currentUser(), api.currentUser(), api.currentUser()]);
  assert.equal(refreshes, 1);
});

test('a protected 401 refreshes and retries exactly once', async () => {
  const vault = createAccessTokenVault();
  vault.set('expired');
  let profileCalls = 0;
  let refreshes = 0;
  const api = createAuthApi({
    baseUrl: 'https://api.example.test',
    vault,
    fetcher: async (request) => {
      if (path(request) === '/api/v1/auth/refresh') {
        refreshes++;
        return json({ access_token: 'renewed', token_type: 'bearer' });
      }
      profileCalls++;
      return request.headers.get('authorization') === 'Bearer expired'
        ? json({ detail: 'expired' }, 401)
        : json(user);
    },
  });

  assert.deepEqual(await api.currentUser(), user);
  assert.equal(refreshes, 1);
  assert.equal(profileCalls, 2);
  assert.equal(vault.get(), 'renewed');
});

test('a protected 403 does not refresh or discard a valid token', async () => {
  const vault = createAccessTokenVault();
  vault.set('active');
  let refreshes = 0;
  const api = createAuthApi({
    baseUrl: 'https://api.example.test',
    vault,
    fetcher: async (request) => {
      if (path(request) === '/api/v1/auth/refresh') refreshes++;
      return json({ detail: 'forbidden' }, 403);
    },
  });

  await assert.rejects(api.currentUser(), isCode('unauthorized'));
  assert.equal(refreshes, 0);
  assert.equal(vault.get(), 'active');
});

test('a delayed stale 401 reuses a token refreshed by a concurrent request', async () => {
  const vault = createAccessTokenVault();
  vault.set('expired');
  let refreshes = 0;
  let releaseDelayed: (() => void) | undefined;
  const delayed = new Promise<void>((resolve) => {
    releaseDelayed = resolve;
  });
  let expiredCalls = 0;
  const api = createAuthApi({
    baseUrl: 'https://api.example.test',
    vault,
    fetcher: async (request) => {
      if (path(request) === '/api/v1/auth/refresh') {
        refreshes++;
        releaseDelayed?.();
        return json({ access_token: 'renewed', token_type: 'bearer' });
      }
      if (request.headers.get('authorization') === 'Bearer expired') {
        expiredCalls++;
        if (expiredCalls === 2) await delayed;
        return json({ detail: 'expired' }, 401);
      }
      return json(user);
    },
  });

  await Promise.all([api.currentUser(), api.currentUser()]);
  assert.equal(refreshes, 1);
  assert.equal(vault.get(), 'renewed');
});

test('a retrying protected request stops after the second 401', async () => {
  const vault = createAccessTokenVault();
  vault.set('expired');
  let profileCalls = 0;
  const api = createAuthApi({
    baseUrl: 'https://api.example.test',
    vault,
    fetcher: async (request) => {
      if (path(request) === '/api/v1/auth/refresh')
        return json({ access_token: 'renewed', token_type: 'bearer' });
      profileCalls++;
      return json({ detail: 'unauthorized' }, 401);
    },
  });

  await assert.rejects(api.currentUser(), isCode('unauthorized'));
  assert.equal(profileCalls, 2);
  assert.equal(vault.get(), null);
});

test('rejected refresh bootstraps an anonymous session', async () => {
  const api = createAuthApi({
    baseUrl: 'https://api.example.test',
    vault: createAccessTokenVault(),
    fetcher: async () => json({ detail: 'no refresh cookie' }, 401),
  });
  assert.deepEqual(await api.session(), { kind: 'anonymous' });
});

test('login terms and MFA secrets only appear in in-memory transitions', async () => {
  const responses = [
    json({ requires_terms_acceptance: true, transaction_token: 'terms-secret' }),
    json({
      status: 'verification_required',
      challenge_token: 'challenge-secret',
      expires_in: 300,
      methods: [{ id: 'email-1', type: 'email', label: 'Email' }],
      preferred_method: 'email-1',
      recovery_available: false,
    }),
  ];
  const api = createAuthApi({
    baseUrl: 'https://api.example.test',
    vault: createAccessTokenVault(),
    fetcher: async () => responses.shift()!,
  });
  const input = { email: 'traveler@example.test', password: 'secret', remember_me: false };

  assert.deepEqual(await api.login(input), {
    kind: 'termsRequired',
    transactionToken: 'terms-secret',
  });
  assert.equal((await api.login(input)).kind, 'mfaRequired');
});

test('successful login stores the token but returns only public session data', async () => {
  const vault = createAccessTokenVault();
  const api = createAuthApi({
    baseUrl: 'https://api.example.test',
    vault,
    fetcher: async (request) =>
      path(request) === '/api/v1/auth/login'
        ? json({ access_token: 'login-token', token_type: 'bearer' })
        : json(user),
  });

  const result = await api.login({
    email: 'traveler@example.test',
    password: 'secret',
    remember_me: false,
  });
  assert.deepEqual(result, { kind: 'authenticated', user });
  assert.equal(vault.get(), 'login-token');
  assert.equal(JSON.stringify(result).includes('login-token'), false);
});

test('logout clears the memory token even when the backend fails', async () => {
  const vault = createAccessTokenVault();
  vault.set('active');
  const api = createAuthApi({
    baseUrl: 'https://api.example.test',
    vault,
    fetcher: async () => json({ detail: 'unavailable' }, 503),
  });
  await assert.rejects(api.logout(), isCode('server'));
  assert.equal(vault.get(), null);
});

test('TanStack contracts use stable keys and do not retain sensitive mutations', () => {
  const queryClient = new QueryClient();
  const api = {} as Parameters<typeof createAuthContracts>[0];
  const contracts = createAuthContracts(api, queryClient);
  const session = contracts.session();
  const terms = contracts.currentTerms();
  assert.deepEqual(session.queryKey, authKeys.session());
  assert.equal(session.staleTime, Infinity);
  assert.deepEqual(terms.queryKey, authKeys.terms());
  assert.equal(terms.staleTime, 5 * 60 * 1000);

  const sensitiveMutations = [
    contracts.login(),
    contracts.acceptTerms(),
    contracts.selectMfa(),
    contracts.verifyMfa(),
    contracts.register(),
    contracts.confirmRegistration(),
    contracts.resendRegistrationOtp(),
    contracts.forgotPassword(),
    contracts.resetPassword(),
    contracts.acceptInvitation(),
  ];
  for (const mutation of sensitiveMutations) assert.equal(mutation.gcTime, 0);
});

test('TanStack mutations cache only public session state and logout clears auth data', async () => {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  let transition: LoginTransition = {
    kind: 'termsRequired',
    transactionToken: 'terms-secret',
  };
  let logoutAll: boolean | undefined;
  const api = {
    login: async () => transition,
    logout: async (all?: boolean) => {
      logoutAll = all;
    },
  } as unknown as AuthApi;
  const contracts = createAuthContracts(api, queryClient);
  const loginInput = {
    email: 'traveler@example.test',
    password: 'secret',
    remember_me: false,
  };

  await queryClient.getMutationCache().build(queryClient, contracts.login()).execute(loginInput);
  assert.equal(queryClient.getQueryData(authKeys.session()), undefined);

  transition = { kind: 'authenticated', user };
  await queryClient.getMutationCache().build(queryClient, contracts.login()).execute(loginInput);
  assert.deepEqual(queryClient.getQueryData(authKeys.session()), {
    kind: 'authenticated',
    user,
  });

  queryClient.setQueryData(authKeys.terms(), { version: 'test' });
  await queryClient
    .getMutationCache()
    .build(queryClient, contracts.logout())
    .execute({ all: true });
  assert.equal(logoutAll, true);
  assert.equal(queryClient.getQueryData(authKeys.terms()), undefined);
  assert.deepEqual(queryClient.getQueryData(authKeys.session()), { kind: 'anonymous' });
});

test('server query clients are isolated and disable automatic retries and focus refetching', () => {
  const first = getQueryClient();
  const second = getQueryClient();
  const defaults = first.getDefaultOptions();

  assert.notEqual(first, second);
  assert.equal(defaults.queries?.retry, false);
  assert.equal(defaults.queries?.refetchOnWindowFocus, false);
  assert.equal(defaults.mutations?.retry, false);
});
