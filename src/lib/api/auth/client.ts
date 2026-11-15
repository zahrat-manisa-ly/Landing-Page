import createClient from 'openapi-fetch';
import type { paths } from '../generated/openapi.ts';
import { ApiError } from '../errors.ts';
import { accessTokenVault, type AccessTokenVault } from './token-vault.ts';
import type {
  AuthSession,
  ConfirmRegistrationInput,
  CurrentTerms,
  CurrentUser,
  ForgotPasswordInput,
  ForgotPasswordResult,
  InvitationAcceptanceInput,
  InvitationAcceptanceResult,
  LoginInput,
  LoginTransition,
  MfaChallenge,
  MfaSelection,
  MfaVerificationTransition,
  RegistrationInput,
  ResendRegistrationOtpInput,
  ResetPasswordInput,
  TermsTransition,
  VerifyMfaInput,
} from './types.ts';

type Fetcher = (input: Request) => Promise<Response>;
type ApiResult<T> =
  | { data: T; error?: never; response: Response }
  | { data?: never; error: unknown; response: Response };

export interface AuthApiOptions {
  baseUrl: string;
  fetcher?: Fetcher;
  vault?: AccessTokenVault;
}

export interface AuthApi {
  session(signal?: AbortSignal): Promise<AuthSession>;
  currentUser(signal?: AbortSignal): Promise<CurrentUser>;
  currentTerms(signal?: AbortSignal): Promise<CurrentTerms>;
  login(input: LoginInput, signal?: AbortSignal): Promise<LoginTransition>;
  acceptTerms(transactionToken: string, signal?: AbortSignal): Promise<TermsTransition>;
  selectMfa(challengeToken: string, methodId: string, signal?: AbortSignal): Promise<MfaSelection>;
  verifyMfa(input: VerifyMfaInput, signal?: AbortSignal): Promise<MfaVerificationTransition>;
  logout(all?: boolean, signal?: AbortSignal): Promise<void>;
  register(input: RegistrationInput, signal?: AbortSignal): Promise<void>;
  confirmRegistration(input: ConfirmRegistrationInput, signal?: AbortSignal): Promise<CurrentUser>;
  resendRegistrationOtp(input: ResendRegistrationOtpInput, signal?: AbortSignal): Promise<void>;
  forgotPassword(input: ForgotPasswordInput, signal?: AbortSignal): Promise<ForgotPasswordResult>;
  resetPassword(input: ResetPasswordInput, signal?: AbortSignal): Promise<void>;
  acceptInvitation(
    input: InvitationAcceptanceInput,
    signal?: AbortSignal,
  ): Promise<InvitationAcceptanceResult>;
}

function normalizedBaseUrl(value: string): string {
  if (!value.trim()) throw new ApiError('configuration');
  let url: URL;
  try {
    url = new URL(
      value,
      typeof window === 'undefined' ? 'https://frontend.invalid' : window.location.origin,
    );
  } catch {
    throw new ApiError('configuration');
  }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (
    (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new ApiError('configuration');
  return url.toString().replace(/\/$/, '');
}

function apiError(response: Response): ApiError {
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
  return new ApiError(code, status, response.headers.get('x-request-id') ?? undefined);
}

async function execute<T>(operation: () => Promise<ApiResult<T>>): Promise<NonNullable<T>> {
  try {
    const result = await operation();
    if (result.error !== undefined || !result.response.ok) throw apiError(result.response);
    if (result.data === undefined || result.data === null) throw new ApiError('invalidResponse');
    return result.data as NonNullable<T>;
  } catch (error) {
    if (error instanceof ApiError || (error instanceof Error && error.name === 'AbortError'))
      throw error;
    if (error instanceof SyntaxError) throw new ApiError('invalidResponse');
    throw new ApiError('network');
  }
}

async function executeVoid<T>(operation: () => Promise<ApiResult<T>>): Promise<void> {
  try {
    const result = await operation();
    if (result.error !== undefined || !result.response.ok) throw apiError(result.response);
  } catch (error) {
    if (error instanceof ApiError || (error instanceof Error && error.name === 'AbortError'))
      throw error;
    if (error instanceof SyntaxError) throw new ApiError('invalidResponse');
    throw new ApiError('network');
  }
}

function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function tokenFrom(value: unknown): string | null {
  const data = object(value);
  return data && typeof data.access_token === 'string' && data.access_token.length <= 32768
    ? data.access_token
    : null;
}

function challengeFrom(value: unknown): MfaChallenge | null {
  const data = object(value);
  if (
    !data ||
    typeof data.challenge_token !== 'string' ||
    typeof data.expires_in !== 'number' ||
    !Array.isArray(data.methods) ||
    (data.preferred_method !== null && typeof data.preferred_method !== 'string') ||
    typeof data.recovery_available !== 'boolean'
  )
    return null;
  return {
    challengeToken: data.challenge_token,
    expiresIn: data.expires_in,
    methods: data.methods as MfaChallenge['methods'],
    preferredMethod: data.preferred_method,
    recoveryAvailable: data.recovery_available,
  };
}

function proofBody(input: VerifyMfaInput) {
  const body = {
    challenge_token: input.challengeToken,
    trust_browser: input.trustBrowser ?? false,
    browser_label: input.browserLabel ?? 'Browser',
  };
  if (input.proof.kind === 'code') return { ...body, code: input.proof.code };
  if (input.proof.kind === 'recovery') return { ...body, recovery_code: input.proof.recoveryCode };
  return { ...body, credential: input.proof.credential };
}

export function createAuthApi(options: AuthApiOptions): AuthApi {
  const vault = options.vault ?? accessTokenVault;
  const client = createClient<paths>({
    baseUrl: normalizedBaseUrl(options.baseUrl),
    credentials: 'include',
    cache: 'no-store',
    redirect: 'error',
    ...(options.fetcher ? { fetch: options.fetcher } : {}),
    headers: { Accept: 'application/json' },
  });
  let refreshPromise: Promise<string> | null = null;

  async function refresh(): Promise<string> {
    if (!refreshPromise) {
      refreshPromise = execute(() => client.POST('/api/v1/auth/refresh'))
        .then((data) => {
          const token = tokenFrom(data);
          if (!token) throw new ApiError('invalidResponse');
          vault.set(token);
          return token;
        })
        .catch((error) => {
          if (error instanceof ApiError && error.code === 'unauthorized') vault.clear();
          throw error;
        })
        .finally(() => {
          refreshPromise = null;
        });
    }
    return refreshPromise;
  }

  async function withToken<T>(
    operation: (token: string) => Promise<ApiResult<T>>,
  ): Promise<NonNullable<T>> {
    let token = vault.get() ?? (await refresh());
    try {
      return await execute(() => operation(token));
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) throw error;
      if (vault.get() === token) vault.clear();
      token = vault.get() ?? (await refresh());
      try {
        return await execute(() => operation(token));
      } catch (retryError) {
        if (retryError instanceof ApiError && retryError.status === 401 && vault.get() === token)
          vault.clear();
        throw retryError;
      }
    }
  }

  const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

  async function currentUser(signal?: AbortSignal): Promise<CurrentUser> {
    return withToken<CurrentUser>((token) =>
      client.GET('/api/v1/auth/me', { headers: bearer(token), signal }),
    );
  }

  async function completeAuthentication(
    value: unknown,
    signal?: AbortSignal,
  ): Promise<CurrentUser> {
    const token = tokenFrom(value);
    if (!token) throw new ApiError('invalidResponse');
    vault.set(token);
    try {
      return await execute(() => client.GET('/api/v1/auth/me', { headers: bearer(token), signal }));
    } catch (error) {
      vault.clear();
      throw error;
    }
  }

  async function loginTransition(value: unknown, signal?: AbortSignal): Promise<LoginTransition> {
    if (tokenFrom(value))
      return { kind: 'authenticated', user: await completeAuthentication(value, signal) };
    const data = object(value);
    if (data && typeof data.transaction_token === 'string')
      return { kind: 'termsRequired', transactionToken: data.transaction_token };
    const challenge = challengeFrom(value);
    if (challenge) return { kind: 'mfaRequired', challenge };
    throw new ApiError('invalidResponse');
  }

  return {
    async session(signal) {
      try {
        return { kind: 'authenticated', user: await currentUser(signal) };
      } catch (error) {
        if (error instanceof ApiError && error.code === 'unauthorized')
          return { kind: 'anonymous' };
        throw error;
      }
    },
    currentUser,
    currentTerms: (signal) => execute(() => client.GET('/api/v1/terms/current', { signal })),
    async login(input, signal) {
      const result = await execute(() =>
        client.POST('/api/v1/auth/login', { body: input, signal }),
      );
      return loginTransition(result, signal);
    },
    async acceptTerms(transactionToken, signal) {
      const result = await execute(() =>
        client.POST('/api/v1/auth/login/accept-terms', {
          body: { transaction_token: transactionToken },
          signal,
        }),
      );
      const transition = await loginTransition(result, signal);
      if (transition.kind === 'termsRequired') throw new ApiError('invalidResponse');
      return transition;
    },
    selectMfa: (challengeToken, methodId, signal) =>
      execute(() =>
        client.POST('/api/v1/mfa/select', {
          body: { challenge_token: challengeToken, method_id: methodId },
          signal,
        }),
      ),
    async verifyMfa(input, signal) {
      const result = await execute(() =>
        client.POST('/api/v1/mfa/verify', { body: proofBody(input), signal }),
      );
      if (tokenFrom(result))
        return { kind: 'authenticated', user: await completeAuthentication(result, signal) };
      const data = object(result);
      if (data && typeof data.settings_token === 'string' && typeof data.expires_in === 'number')
        return {
          kind: 'settingsGranted',
          settingsToken: data.settings_token,
          expiresIn: data.expires_in,
        };
      throw new ApiError('invalidResponse');
    },
    async logout(all = false, signal) {
      try {
        await withToken((token) =>
          client.POST('/api/v1/auth/logout', {
            params: { query: { all } },
            headers: bearer(token),
            signal,
          }),
        );
      } finally {
        vault.clear();
      }
    },
    async register(input, signal) {
      await executeVoid(() => client.POST('/api/v1/auth/register', { body: input, signal }));
    },
    async confirmRegistration(input, signal) {
      const result = await execute(() =>
        client.POST('/api/v1/auth/register/confirm', { body: input, signal }),
      );
      return completeAuthentication(result, signal);
    },
    async resendRegistrationOtp(input, signal) {
      await executeVoid(() =>
        client.POST('/api/v1/auth/register/resend-registration-otp', { body: input, signal }),
      );
    },
    forgotPassword: (input, signal) =>
      execute(() => client.POST('/api/v1/auth/forgot-password', { body: input, signal })),
    async resetPassword(input, signal) {
      await executeVoid(() => client.POST('/api/v1/auth/reset-password', { body: input, signal }));
    },
    acceptInvitation: (input, signal) =>
      execute(() => client.POST('/api/v1/customers/invitations/accept', { body: input, signal })),
  };
}
