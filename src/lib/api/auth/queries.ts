import { mutationOptions, queryOptions, type QueryClient } from '@tanstack/react-query';
import type { AuthApi } from './client.ts';
import type {
  ConfirmRegistrationInput,
  ForgotPasswordInput,
  InvitationAcceptanceInput,
  LoginInput,
  RegistrationInput,
  ResendRegistrationOtpInput,
  ResetPasswordInput,
  VerifyMfaInput,
} from './types.ts';

export const authKeys = {
  all: ['auth'] as const,
  session: () => [...authKeys.all, 'session'] as const,
  terms: () => [...authKeys.all, 'terms'] as const,
};

export function createAuthContracts(api: AuthApi, queryClient: QueryClient) {
  const updateSession = (data: Awaited<ReturnType<AuthApi['session']>>) =>
    queryClient.setQueryData(authKeys.session(), data);
  const updateAuthenticated = (user: Awaited<ReturnType<AuthApi['currentUser']>>) =>
    updateSession({ kind: 'authenticated', user });

  return {
    session: () =>
      queryOptions({
        queryKey: authKeys.session(),
        queryFn: ({ signal }) => api.session(signal),
        staleTime: Infinity,
      }),
    currentTerms: () =>
      queryOptions({
        queryKey: authKeys.terms(),
        queryFn: ({ signal }) => api.currentTerms(signal),
        staleTime: 5 * 60 * 1000,
      }),
    login: () =>
      mutationOptions({
        mutationFn: (input: LoginInput) => api.login(input),
        onSuccess: (transition) => {
          if (transition.kind === 'authenticated') updateAuthenticated(transition.user);
        },
        gcTime: 0,
      }),
    acceptTerms: () =>
      mutationOptions({
        mutationFn: (transactionToken: string) => api.acceptTerms(transactionToken),
        onSuccess: (transition) => {
          if (transition.kind === 'authenticated') updateAuthenticated(transition.user);
        },
        gcTime: 0,
      }),
    selectMfa: () =>
      mutationOptions({
        mutationFn: ({ challengeToken, methodId }: { challengeToken: string; methodId: string }) =>
          api.selectMfa(challengeToken, methodId),
        gcTime: 0,
      }),
    verifyMfa: () =>
      mutationOptions({
        mutationFn: (input: VerifyMfaInput) => api.verifyMfa(input),
        onSuccess: (transition) => {
          if (transition.kind === 'authenticated') updateAuthenticated(transition.user);
        },
        gcTime: 0,
      }),
    logout: () =>
      mutationOptions({
        mutationFn: ({ all = false }: { all?: boolean }) => api.logout(all),
        onSettled: async () => {
          queryClient.removeQueries({ queryKey: authKeys.all });
          updateSession({ kind: 'anonymous' });
        },
      }),
    register: () =>
      mutationOptions({ mutationFn: (input: RegistrationInput) => api.register(input), gcTime: 0 }),
    confirmRegistration: () =>
      mutationOptions({
        mutationFn: (input: ConfirmRegistrationInput) => api.confirmRegistration(input),
        onSuccess: updateAuthenticated,
        gcTime: 0,
      }),
    resendRegistrationOtp: () =>
      mutationOptions({
        mutationFn: (input: ResendRegistrationOtpInput) => api.resendRegistrationOtp(input),
        gcTime: 0,
      }),
    forgotPassword: () =>
      mutationOptions({
        mutationFn: (input: ForgotPasswordInput) => api.forgotPassword(input),
        gcTime: 0,
      }),
    resetPassword: () =>
      mutationOptions({
        mutationFn: (input: ResetPasswordInput) => api.resetPassword(input),
        gcTime: 0,
      }),
    acceptInvitation: () =>
      mutationOptions({
        mutationFn: (input: InvitationAcceptanceInput) => api.acceptInvitation(input),
        gcTime: 0,
      }),
  };
}
