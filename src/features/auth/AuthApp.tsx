import { useEffect, useReducer, useRef, useState } from 'react';
import { QueryClientProvider, useMutation, useQuery } from '@tanstack/react-query';
import type { Locale } from '../../lib/domain/types.ts';
import { route } from '../../i18n/index.ts';
import { ApiError } from '../../lib/api/errors.ts';
import {
  getAuthContracts,
  getQueryClient,
  type CurrentUser,
  type LoginTransition,
  type MfaChallenge,
} from '../../lib/api/auth/index.ts';
import { authText, type AuthMessageKey } from './messages.ts';
import { customerIdentifier, validOtp, validPassword } from './validation.ts';
import { safeAuthReturnPath } from './navigation.ts';

export type AuthMode =
  | 'sign-in'
  | 'register'
  | 'verify-registration'
  | 'forgot-password'
  | 'reset-password'
  | 'invitation';

interface Props {
  locale: Locale;
  mode: AuthMode;
  available: boolean;
}

type Errors = Record<string, AuthMessageKey>;

function errorMessage(locale: Locale, error: unknown): string {
  if (!(error instanceof ApiError)) return authText(locale, 'unavailable');
  if (error.code === 'configuration') return authText(locale, 'configuration');
  if (error.code === 'rateLimited') return authText(locale, 'throttled');
  if (error.code === 'expired') return authText(locale, 'expired');
  if (error.code === 'unauthorized' || error.code === 'notFound')
    return authText(locale, 'invalid');
  return authText(locale, 'unavailable');
}

function focusFirstInvalid(form: HTMLFormElement | null): void {
  requestAnimationFrame(() => form?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
}

async function mutationResult<T>(
  promise: Promise<T>,
): Promise<{ ok: true; data: T } | { ok: false }> {
  try {
    return { ok: true, data: await promise };
  } catch {
    return { ok: false };
  }
}

interface FieldProps {
  locale: Locale;
  label: AuthMessageKey;
  name: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  error?: AuthMessageKey;
  hint?: AuthMessageKey;
  autoComplete?: string;
  semantic?: boolean;
}

function Field({
  locale,
  label,
  name,
  type = 'text',
  value,
  onChange,
  error,
  hint,
  autoComplete,
  semantic = false,
}: FieldProps) {
  const errorId = `${name}-error`;
  const hintId = `${name}-hint`;
  return (
    <div className="auth-field-wrap">
      <label className="field" data-invalid={!!error}>
        <span className="field-label">{authText(locale, label)}</span>
        <input
          className={semantic ? 'auth-semantic' : undefined}
          dir={semantic ? 'ltr' : undefined}
          name={name}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          required
          aria-invalid={!!error}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
        />
      </label>
      {error ? (
        <p className="field-error" id={errorId}>
          {authText(locale, error)}
        </p>
      ) : hint ? (
        <p className="auth-hint" id={hintId}>
          {authText(locale, hint)}
        </p>
      ) : null}
    </div>
  );
}

function Failure({ locale, error }: { locale: Locale; error: unknown }) {
  return error ? (
    <p className="auth-error-summary" role="alert">
      {errorMessage(locale, error)}
    </p>
  ) : null;
}

type SignInState =
  | { step: 'credentials' }
  | { step: 'terms'; transactionToken: string }
  | { step: 'methods'; challenge: MfaChallenge }
  | { step: 'proof'; challenge: MfaChallenge; methodId?: string; proof: 'code' | 'recovery' }
  | { step: 'webauthn'; challenge: MfaChallenge }
  | { step: 'complete'; user: CurrentUser }
  | { step: 'settings' };

type SignInAction =
  | { type: 'transition'; transition: LoginTransition }
  | { type: 'proof'; challenge: MfaChallenge; methodId?: string; proof: 'code' | 'recovery' }
  | { type: 'webauthn'; challenge: MfaChallenge }
  | { type: 'complete'; user: CurrentUser }
  | { type: 'settings' }
  | { type: 'restart' }
  | { type: 'methods'; challenge: MfaChallenge };

function signInReducer(_: SignInState, action: SignInAction): SignInState {
  if (action.type === 'restart') return { step: 'credentials' };
  if (action.type === 'proof') return { step: 'proof', ...action };
  if (action.type === 'webauthn') return { step: 'webauthn', challenge: action.challenge };
  if (action.type === 'complete') return { step: 'complete', user: action.user };
  if (action.type === 'settings') return { step: 'settings' };
  if (action.type === 'methods') return { step: 'methods', challenge: action.challenge };
  if (action.transition.kind === 'authenticated')
    return { step: 'complete', user: action.transition.user };
  if (action.transition.kind === 'termsRequired')
    return { step: 'terms', transactionToken: action.transition.transactionToken };
  return { step: 'methods', challenge: action.transition.challenge };
}

function CredentialsStep({
  locale,
  dispatch,
}: {
  locale: Locale;
  dispatch: React.Dispatch<SignInAction>;
}) {
  const contracts = getAuthContracts();
  const login = useMutation(contracts.login());
  const form = useRef<HTMLFormElement>(null);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Errors>({});

  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = customerIdentifier(identifier);
    const next: Errors = {};
    if (!parsed) next.identifier = 'identifierError';
    if (!password) next.password = 'required';
    setErrors(next);
    if (Object.keys(next).length) return focusFirstInvalid(form.current);
    const result = await mutationResult(
      login.mutateAsync({ ...parsed!, password, remember_me: false }),
    );
    if (!result.ok) return;
    setPassword('');
    dispatch({ type: 'transition', transition: result.data });
  }

  return (
    <form ref={form} className="auth-form" onSubmit={submit} noValidate>
      <Field
        locale={locale}
        label="identifier"
        name="identifier"
        value={identifier}
        onChange={setIdentifier}
        error={errors.identifier}
        hint="identifierHint"
        autoComplete="username"
        semantic
      />
      <Field
        locale={locale}
        label="password"
        name="password"
        type="password"
        value={password}
        onChange={setPassword}
        error={errors.password}
        autoComplete="current-password"
        semantic
      />
      {Object.keys(errors).length > 0 && (
        <p className="auth-error-summary" role="alert">
          {authText(locale, 'checkFields')}
        </p>
      )}
      <Failure locale={locale} error={login.error} />
      <div className="auth-actions">
        <button className="btn btn-primary" type="submit" disabled={login.isPending}>
          {authText(locale, login.isPending ? 'signingIn' : 'continue')}
        </button>
      </div>
      <div className="auth-links">
        <a href={route(locale, 'auth/forgot-password')}>{authText(locale, 'forgotLink')}</a>
        <span>
          {authText(locale, 'needAccount')}{' '}
          <a href={route(locale, 'auth/register')}>{authText(locale, 'registerLink')}</a>
        </span>
      </div>
    </form>
  );
}

function TermsStep({
  locale,
  token,
  dispatch,
}: {
  locale: Locale;
  token: string;
  dispatch: React.Dispatch<SignInAction>;
}) {
  const contracts = getAuthContracts();
  const terms = useQuery(contracts.currentTerms());
  const accept = useMutation(contracts.acceptTerms());
  async function continueLogin() {
    const result = await mutationResult(accept.mutateAsync(token));
    if (result.ok) dispatch({ type: 'transition', transition: result.data });
  }
  return (
    <div className="auth-step">
      <h2>{authText(locale, 'termsTitle')}</h2>
      <p className="auth-step-copy">{authText(locale, 'termsIntro')}</p>
      {terms.isPending ? (
        <p role="status">{authText(locale, 'loadingTerms')}</p>
      ) : terms.data ? (
        <div className="auth-terms" tabIndex={0}>
          {terms.data.content.map((section, index) => (
            <section key={`${section.title}-${index}`}>
              <h3>{section.title}</h3>
              <ul>
                {section.items.map((item, itemIndex) => (
                  <li key={itemIndex}>{item}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <div className="auth-status">
          <Failure locale={locale} error={terms.error} />
          <div className="auth-actions">
            <button className="btn btn-secondary" type="button" onClick={() => terms.refetch()}>
              {authText(locale, 'retry')}
            </button>
          </div>
        </div>
      )}
      <Failure locale={locale} error={accept.error} />
      <div className="auth-actions">
        <button
          className="btn btn-primary"
          type="button"
          onClick={continueLogin}
          disabled={!terms.data || accept.isPending}
        >
          {authText(locale, 'acceptTerms')}
        </button>
        <button
          className="btn btn-secondary"
          type="button"
          onClick={() => dispatch({ type: 'restart' })}
        >
          {authText(locale, 'restartSignIn')}
        </button>
      </div>
    </div>
  );
}

function MethodsStep({
  locale,
  challenge,
  dispatch,
}: {
  locale: Locale;
  challenge: MfaChallenge;
  dispatch: React.Dispatch<SignInAction>;
}) {
  const select = useMutation(getAuthContracts().selectMfa());
  async function choose(method: MfaChallenge['methods'][number]) {
    const result = await mutationResult(
      select.mutateAsync({ challengeToken: challenge.challengeToken, methodId: method.id }),
    );
    if (!result.ok) return;
    if (result.data.type === 'webauthn') dispatch({ type: 'webauthn', challenge });
    else dispatch({ type: 'proof', challenge, methodId: method.id, proof: 'code' });
  }
  return (
    <div className="auth-step">
      <h2>{authText(locale, 'mfaTitle')}</h2>
      <p className="auth-step-copy">{authText(locale, 'mfaIntro')}</p>
      <div className="auth-methods">
        {challenge.methods.map((method) => (
          <button
            className="auth-method"
            type="button"
            key={method.id}
            onClick={() => choose(method)}
            disabled={select.isPending}
          >
            <span>
              <strong>{method.label}</strong>
              <span>{method.type}</span>
            </span>
            <b aria-hidden="true">{locale === 'ar' ? '←' : '→'}</b>
          </button>
        ))}
      </div>
      {!challenge.methods.length && !challenge.recoveryAvailable && (
        <div className="auth-status">
          <p className="auth-error-summary" role="alert">
            {authText(locale, 'unsupportedMethod')}
          </p>
          <div className="auth-actions">
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => dispatch({ type: 'restart' })}
            >
              {authText(locale, 'restartSignIn')}
            </button>
          </div>
        </div>
      )}
      {challenge.recoveryAvailable && (
        <button
          className="btn btn-secondary"
          type="button"
          onClick={() => dispatch({ type: 'proof', challenge, proof: 'recovery' })}
        >
          {authText(locale, 'useRecovery')}
        </button>
      )}
      <Failure locale={locale} error={select.error} />
    </div>
  );
}

function ProofStep({
  locale,
  state,
  dispatch,
}: {
  locale: Locale;
  state: Extract<SignInState, { step: 'proof' }>;
  dispatch: React.Dispatch<SignInAction>;
}) {
  const verify = useMutation(getAuthContracts().verifyMfa());
  const form = useRef<HTMLFormElement>(null);
  const [value, setValue] = useState('');
  const [invalid, setInvalid] = useState(false);
  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validOtp(value)) {
      setInvalid(true);
      return focusFirstInvalid(form.current);
    }
    const result = await mutationResult(
      verify.mutateAsync({
        challengeToken: state.challenge.challengeToken,
        proof:
          state.proof === 'code'
            ? { kind: 'code', code: value.trim() }
            : { kind: 'recovery', recoveryCode: value.trim() },
      }),
    );
    if (!result.ok) return;
    setValue('');
    if (result.data.kind === 'authenticated')
      dispatch({ type: 'complete', user: result.data.user });
    else dispatch({ type: 'settings' });
  }
  const label = state.proof === 'code' ? 'code' : 'recoveryCode';
  return (
    <form ref={form} className="auth-form auth-step" onSubmit={submit} noValidate>
      <h2>{authText(locale, 'mfaTitle')}</h2>
      <p className="auth-step-copy">
        {state.proof === 'code' ? authText(locale, 'codeSent') : authText(locale, 'useRecovery')}
      </p>
      <Field
        locale={locale}
        label={label}
        name="mfa-proof"
        value={value}
        onChange={(next) => {
          setValue(next);
          setInvalid(false);
        }}
        error={invalid ? 'otpError' : undefined}
        autoComplete="one-time-code"
        semantic
      />
      <Failure locale={locale} error={verify.error} />
      <div className="auth-actions">
        <button className="btn btn-primary" disabled={verify.isPending}>
          {authText(locale, verify.isPending ? 'verifying' : 'verify')}
        </button>
        <button
          className="btn btn-secondary"
          type="button"
          onClick={() => dispatch({ type: 'methods', challenge: state.challenge })}
        >
          {authText(locale, 'chooseAnother')}
        </button>
      </div>
    </form>
  );
}

function SignIn({ locale }: { locale: Locale }) {
  const [state, dispatch] = useReducer(signInReducer, { step: 'credentials' });
  useEffect(() => {
    if (state.step !== 'complete') return;
    const value = new URLSearchParams(window.location.search).get('returnTo');
    if (value !== null) window.location.assign(safeAuthReturnPath(locale, value));
  }, [locale, state]);
  if (state.step === 'terms')
    return (
      <>
        <TermsStep locale={locale} token={state.transactionToken} dispatch={dispatch} />
        <p className="auth-reload">{authText(locale, 'reloadNotice')}</p>
      </>
    );
  if (state.step === 'methods')
    return (
      <>
        <MethodsStep locale={locale} challenge={state.challenge} dispatch={dispatch} />
        <p className="auth-reload">{authText(locale, 'reloadNotice')}</p>
      </>
    );
  if (state.step === 'proof')
    return (
      <>
        <ProofStep locale={locale} state={state} dispatch={dispatch} />
        <p className="auth-reload">{authText(locale, 'reloadNotice')}</p>
      </>
    );
  if (state.step === 'webauthn')
    return (
      <div className="auth-status">
        <h2>{authText(locale, 'webauthnTitle')}</h2>
        <p>{authText(locale, 'webauthnText')}</p>
        <div className="auth-actions">
          <button
            className="btn btn-secondary"
            onClick={() => dispatch({ type: 'methods', challenge: state.challenge })}
          >
            {authText(locale, 'chooseAnother')}
          </button>
        </div>
      </div>
    );
  if (state.step === 'settings')
    return (
      <div className="auth-status">
        <h2>{authText(locale, 'mfaTitle')}</h2>
        <p>{authText(locale, 'settingsGranted')}</p>
        <div className="auth-actions">
          <button className="btn btn-primary" onClick={() => dispatch({ type: 'restart' })}>
            {authText(locale, 'restartSignIn')}
          </button>
        </div>
      </div>
    );
  if (state.step === 'complete')
    return (
      <div className="auth-status">
        <h2>{authText(locale, 'signedInTitle')}</h2>
        <p>
          {authText(locale, 'signedInText')} {state.user.first_name}
        </p>
        <div className="auth-actions">
          <a className="btn btn-primary" href={route(locale, 'flights')}>
            {authText(locale, 'goFlights')}
          </a>
        </div>
      </div>
    );
  return (
    <>
      <CredentialsStep locale={locale} dispatch={dispatch} />
      <p className="auth-reload">{authText(locale, 'reloadNotice')}</p>
    </>
  );
}

function Registration({ locale }: { locale: Locale }) {
  const register = useMutation(getAuthContracts().register());
  const form = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState({
    first: '',
    last: '',
    identifier: '',
    password: '',
    confirm: '',
    terms: false,
  });
  const [errors, setErrors] = useState<Errors>({});
  const [complete, setComplete] = useState(false);
  if (complete)
    return (
      <div className="auth-status">
        <h2>{authText(locale, 'accountCreated')}</h2>
        <p>{authText(locale, 'accountCreatedText')}</p>
        <div className="auth-actions">
          <a className="btn btn-primary" href={route(locale, 'auth/register/verify')}>
            {authText(locale, 'verifyLink')}
          </a>
        </div>
      </div>
    );
  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const identifier = customerIdentifier(values.identifier);
    const next: Errors = {};
    if (!values.first.trim()) next.first = 'required';
    if (!values.last.trim()) next.last = 'required';
    if (!identifier) next.identifier = 'identifierError';
    if (!validPassword(values.password)) next.password = 'passwordError';
    if (values.password !== values.confirm) next.confirm = 'passwordMatch';
    if (!values.terms) next.terms = 'termsRequired';
    setErrors(next);
    if (Object.keys(next).length) return focusFirstInvalid(form.current);
    const result = await mutationResult(
      register.mutateAsync({
        ...identifier!,
        first_name: values.first.trim(),
        last_name: values.last.trim(),
        password: values.password,
        confirm_password: values.confirm,
        terms_and_conditions: true,
      }),
    );
    if (!result.ok) return;
    setValues((current) => ({ ...current, password: '', confirm: '' }));
    setComplete(true);
  }
  const update = (key: keyof typeof values) => (value: string) =>
    setValues((current) => ({ ...current, [key]: value }));
  return (
    <form ref={form} className="auth-form" onSubmit={submit} noValidate>
      <div className="auth-grid">
        <Field
          locale={locale}
          label="firstName"
          name="first-name"
          value={values.first}
          onChange={update('first')}
          error={errors.first}
          autoComplete="given-name"
        />
        <Field
          locale={locale}
          label="lastName"
          name="last-name"
          value={values.last}
          onChange={update('last')}
          error={errors.last}
          autoComplete="family-name"
        />
      </div>
      <Field
        locale={locale}
        label="identifier"
        name="register-identifier"
        value={values.identifier}
        onChange={update('identifier')}
        error={errors.identifier}
        hint="identifierHint"
        autoComplete="username"
        semantic
      />
      <div className="auth-grid">
        <Field
          locale={locale}
          label="password"
          name="register-password"
          type="password"
          value={values.password}
          onChange={update('password')}
          error={errors.password}
          hint="passwordHint"
          autoComplete="new-password"
          semantic
        />
        <Field
          locale={locale}
          label="confirmPassword"
          name="register-confirm"
          type="password"
          value={values.confirm}
          onChange={update('confirm')}
          error={errors.confirm}
          autoComplete="new-password"
          semantic
        />
      </div>
      <label className="auth-check">
        <input
          type="checkbox"
          checked={values.terms}
          onChange={(event) =>
            setValues((current) => ({ ...current, terms: event.target.checked }))
          }
          aria-invalid={!!errors.terms}
        />
        <span>{authText(locale, 'termsConsent')}</span>
      </label>
      {errors.terms && <p className="field-error">{authText(locale, errors.terms)}</p>}
      <Failure locale={locale} error={register.error} />
      <button className="btn btn-primary" disabled={register.isPending}>
        {authText(locale, register.isPending ? 'creating' : 'createAccount')}
      </button>
      <div className="auth-links">
        <span>
          {authText(locale, 'haveAccount')}{' '}
          <a href={route(locale, 'auth/sign-in')}>{authText(locale, 'signInLink')}</a>
        </span>
      </div>
    </form>
  );
}

function RegistrationVerification({ locale }: { locale: Locale }) {
  const contracts = getAuthContracts();
  const confirm = useMutation(contracts.confirmRegistration());
  const resend = useMutation(contracts.resendRegistrationOtp());
  const form = useRef<HTMLFormElement>(null);
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [complete, setComplete] = useState(false);
  const [resent, setResent] = useState(false);
  if (complete)
    return (
      <div className="auth-status">
        <h2>{authText(locale, 'accountConfirmed')}</h2>
        <p>{authText(locale, 'signedInText')}</p>
        <div className="auth-actions">
          <a className="btn btn-primary" href={route(locale, 'flights')}>
            {authText(locale, 'goFlights')}
          </a>
        </div>
      </div>
    );
  function validate() {
    const parsed = customerIdentifier(identifier);
    const next: Errors = {};
    if (!parsed) next.identifier = 'identifierError';
    if (!validOtp(otp)) next.otp = 'otpError';
    setErrors(next);
    if (Object.keys(next).length) {
      focusFirstInvalid(form.current);
      return null;
    }
    return parsed;
  }
  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = validate();
    if (!parsed) return;
    const result = await mutationResult(confirm.mutateAsync({ ...parsed, otp: otp.trim() }));
    if (!result.ok) return;
    setOtp('');
    setComplete(true);
  }
  async function sendAgain() {
    const parsed = customerIdentifier(identifier);
    if (!parsed) {
      setErrors({ identifier: 'identifierError' });
      return focusFirstInvalid(form.current);
    }
    const result = await mutationResult(resend.mutateAsync(parsed));
    if (!result.ok) return;
    setResent(true);
  }
  return (
    <form ref={form} className="auth-form" onSubmit={submit} noValidate>
      <Field
        locale={locale}
        label="identifier"
        name="verify-identifier"
        value={identifier}
        onChange={setIdentifier}
        error={errors.identifier}
        hint="identifierHint"
        semantic
      />
      <Field
        locale={locale}
        label="otp"
        name="registration-otp"
        value={otp}
        onChange={setOtp}
        error={errors.otp}
        autoComplete="one-time-code"
        semantic
      />
      {resent && (
        <p className="notice" role="status">
          {authText(locale, 'resent')}
        </p>
      )}
      <Failure locale={locale} error={confirm.error ?? resend.error} />
      <div className="auth-actions">
        <button className="btn btn-primary" disabled={confirm.isPending}>
          {authText(locale, 'confirmAccount')}
        </button>
        <button
          className="btn btn-secondary"
          type="button"
          onClick={sendAgain}
          disabled={resend.isPending}
        >
          {authText(locale, 'resend')}
        </button>
      </div>
    </form>
  );
}

function ForgotPassword({ locale }: { locale: Locale }) {
  const forgot = useMutation(getAuthContracts().forgotPassword());
  const form = useRef<HTMLFormElement>(null);
  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState<AuthMessageKey>();
  const [complete, setComplete] = useState(false);
  if (complete)
    return (
      <div className="auth-status">
        <h2>{authText(locale, 'forgotTitle')}</h2>
        <p>{authText(locale, 'neutralReset')}</p>
      </div>
    );
  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = customerIdentifier(identifier);
    if (!parsed) {
      setError('identifierError');
      return focusFirstInvalid(form.current);
    }
    try {
      await forgot.mutateAsync(parsed);
      setComplete(true);
    } catch (error) {
      if (error instanceof ApiError && ['network', 'server', 'configuration'].includes(error.code))
        return;
      setComplete(true);
    }
  }
  return (
    <form ref={form} className="auth-form" onSubmit={submit} noValidate>
      <Field
        locale={locale}
        label="identifier"
        name="forgot-identifier"
        value={identifier}
        onChange={setIdentifier}
        error={error}
        hint="identifierHint"
        autoComplete="username"
        semantic
      />
      <Failure locale={locale} error={forgot.error && !complete ? forgot.error : null} />
      <button className="btn btn-primary" disabled={forgot.isPending}>
        {authText(locale, 'requestReset')}
      </button>
    </form>
  );
}

function PasswordForm({ locale, invitation }: { locale: Locale; invitation: boolean }) {
  const contracts = getAuthContracts();
  const acceptInvitation = useMutation(contracts.acceptInvitation());
  const resetPassword = useMutation(contracts.resetPassword());
  const form = useRef<HTMLFormElement>(null);
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [logoutOthers, setLogoutOthers] = useState(true);
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [complete, setComplete] = useState(false);
  const pending = invitation ? acceptInvitation.isPending : resetPassword.isPending;
  const mutationError = invitation ? acceptInvitation.error : resetPassword.error;
  if (complete)
    return (
      <div className="auth-status">
        <h2>{authText(locale, invitation ? 'invitationComplete' : 'resetComplete')}</h2>
        <div className="auth-actions">
          <a className="btn btn-primary" href={route(locale, 'auth/sign-in')}>
            {authText(locale, 'signInLink')}
          </a>
        </div>
      </div>
    );
  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const next: Errors = {};
    if (!token.trim()) next.token = 'tokenRequired';
    if (!validPassword(password)) next.password = 'passwordError';
    if (password !== confirm) next.confirm = 'passwordMatch';
    if (invitation && !terms) next.terms = 'termsRequired';
    setErrors(next);
    if (Object.keys(next).length) return focusFirstInvalid(form.current);
    const result = invitation
      ? await mutationResult(
          acceptInvitation.mutateAsync({
            token: token.trim(),
            password,
            confirm_password: confirm,
            terms_and_conditions: true,
          }),
        )
      : await mutationResult(
          resetPassword.mutateAsync({
            token: token.trim(),
            new_password: password,
            confirm_password: confirm,
            logout_other_sessions: logoutOthers,
          }),
        );
    if (!result.ok) return;
    setToken('');
    setPassword('');
    setConfirm('');
    setComplete(true);
  }
  return (
    <form ref={form} className="auth-form" onSubmit={submit} noValidate>
      <Field
        locale={locale}
        label={invitation ? 'invitationToken' : 'resetToken'}
        name="secure-token"
        value={token}
        onChange={setToken}
        error={errors.token}
        semantic
      />
      <div className="auth-grid">
        <Field
          locale={locale}
          label="newPassword"
          name="new-password"
          type="password"
          value={password}
          onChange={setPassword}
          error={errors.password}
          hint="passwordHint"
          autoComplete="new-password"
          semantic
        />
        <Field
          locale={locale}
          label="confirmPassword"
          name="confirm-password"
          type="password"
          value={confirm}
          onChange={setConfirm}
          error={errors.confirm}
          autoComplete="new-password"
          semantic
        />
      </div>
      {invitation ? (
        <>
          <label className="auth-check">
            <input
              type="checkbox"
              checked={terms}
              onChange={(event) => setTerms(event.target.checked)}
              aria-invalid={!!errors.terms}
            />
            <span>{authText(locale, 'termsConsent')}</span>
          </label>
          {errors.terms && <p className="field-error">{authText(locale, errors.terms)}</p>}
        </>
      ) : (
        <label className="auth-check">
          <input
            type="checkbox"
            checked={logoutOthers}
            onChange={(event) => setLogoutOthers(event.target.checked)}
          />
          <span>{authText(locale, 'logoutOthers')}</span>
        </label>
      )}
      <Failure locale={locale} error={mutationError} />
      <button className="btn btn-primary" disabled={pending}>
        {authText(locale, invitation ? 'invitationAction' : 'resetAction')}
      </button>
    </form>
  );
}

function AuthScreen({ locale, mode }: Omit<Props, 'available'>) {
  if (mode === 'sign-in') return <SignIn locale={locale} />;
  if (mode === 'register') return <Registration locale={locale} />;
  if (mode === 'verify-registration') return <RegistrationVerification locale={locale} />;
  if (mode === 'forgot-password') return <ForgotPassword locale={locale} />;
  return <PasswordForm locale={locale} invitation={mode === 'invitation'} />;
}

export default function AuthApp({ locale, mode, available }: Props) {
  if (!available)
    return (
      <div className="auth-status" role="status">
        <p>{authText(locale, 'configuration')}</p>
      </div>
    );
  return (
    <QueryClientProvider client={getQueryClient()}>
      <AuthScreen locale={locale} mode={mode} />
    </QueryClientProvider>
  );
}
