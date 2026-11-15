import type { components } from '../generated/openapi.ts';

type Schemas = components['schemas'];

export type LoginInput = Schemas['LoginRequest'];
export type RegistrationInput = Schemas['RegisterRequest'];
export type ConfirmRegistrationInput = Schemas['ConfirmRegistrationRequest'];
export type ResendRegistrationOtpInput = Schemas['ResendRegistrationOtpRequest'];
export type ForgotPasswordInput = Schemas['ForgotPasswordRequest'];
export type ForgotPasswordResult = Schemas['ForgotPasswordResponse'];
export type ResetPasswordInput = Schemas['ResetPasswordRequest'];
export type InvitationAcceptanceInput = Schemas['InvitationAccept'];
export type InvitationAcceptanceResult = Schemas['UserResponse'];
export type CurrentUser = Schemas['CurrentUserResponse'];
export type CurrentTerms = Schemas['TermsResponse'];
export type MfaMethod = Schemas['MfaPublicMethod'];
export type MfaSelection = Schemas['MfaCodeSentResponse'] | Schemas['MfaWebAuthnSelectionResponse'];

export interface MfaChallenge {
  challengeToken: string;
  expiresIn: number;
  methods: MfaMethod[];
  preferredMethod: string | null;
  recoveryAvailable: boolean;
}

export type LoginTransition =
  | { kind: 'authenticated'; user: CurrentUser }
  | { kind: 'termsRequired'; transactionToken: string }
  | { kind: 'mfaRequired'; challenge: MfaChallenge };

export type TermsTransition = Exclude<LoginTransition, { kind: 'termsRequired' }>;

export type MfaProof =
  | { kind: 'code'; code: string }
  | { kind: 'recovery'; recoveryCode: string }
  | { kind: 'webauthn'; credential: Record<string, unknown> };

export interface VerifyMfaInput {
  challengeToken: string;
  proof: MfaProof;
  trustBrowser?: boolean;
  browserLabel?: string;
}

export type MfaVerificationTransition =
  | { kind: 'authenticated'; user: CurrentUser }
  | { kind: 'settingsGranted'; settingsToken: string; expiresIn: number };

export type AuthSession = { kind: 'anonymous' } | { kind: 'authenticated'; user: CurrentUser };
