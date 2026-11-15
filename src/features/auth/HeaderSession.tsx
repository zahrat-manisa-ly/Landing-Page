import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { QueryClientProvider, useMutation, useQuery } from '@tanstack/react-query';
import { route, t } from '../../i18n/index.ts';
import type { Locale } from '../../lib/domain/types.ts';
import { getAuthContracts, getQueryClient, type CurrentUser } from '../../lib/api/auth/index.ts';

interface Props {
  locale: Locale;
  available: boolean;
  currentPath: string;
  mobileTargetId: string;
}

function signInPath(locale: Locale, currentPath: string): string {
  const search = new URLSearchParams({ returnTo: currentPath });
  return `${route(locale, 'auth/sign-in')}?${search}`;
}

function identity(user: CurrentUser): { name: string; detail: string } {
  const name = `${user.first_name} ${user.last_name}`.trim();
  return { name, detail: user.email ?? user.phone_number ?? user.username ?? name };
}

function Initials({ user }: { user: CurrentUser }) {
  return (
    <span className="account-initials" aria-hidden="true">
      {`${user.first_name[0] ?? ''}${user.last_name[0] ?? ''}`.toUpperCase()}
    </span>
  );
}

function Anonymous({
  locale,
  currentPath,
  mobile = false,
}: Omit<Props, 'available' | 'mobileTargetId'> & { mobile?: boolean }) {
  return (
    <a className={mobile ? 'mobile-sign-in' : 'sign-in'} href={signInPath(locale, currentPath)}>
      {t(locale, 'signIn')}
    </a>
  );
}

function AccountFailure({
  locale,
  retry,
  mobile = false,
}: {
  locale: Locale;
  retry: () => void;
  mobile?: boolean;
}) {
  return (
    <button
      className={mobile ? 'mobile-session-action' : 'session-error'}
      type="button"
      onClick={retry}
      title={t(locale, 'accountUnavailable')}
    >
      {t(locale, 'retryAccount')}
    </button>
  );
}

function DesktopAccount({
  locale,
  user,
  logout,
  loggingOut,
}: {
  locale: Locale;
  user: CurrentUser;
  logout: () => void;
  loggingOut: boolean;
}) {
  const menu = useRef<HTMLDetailsElement>(null);
  const trigger = useRef<HTMLElement>(null);
  const { name, detail } = identity(user);

  useEffect(() => {
    function close(event: KeyboardEvent | MouseEvent) {
      if (!menu.current?.open) return;
      if (event instanceof KeyboardEvent && event.key === 'Escape') {
        menu.current.open = false;
        trigger.current?.focus();
      } else if (
        event instanceof MouseEvent &&
        event.target instanceof Node &&
        !menu.current.contains(event.target)
      ) {
        menu.current.open = false;
      }
    }
    document.addEventListener('keydown', close);
    document.addEventListener('click', close);
    return () => {
      document.removeEventListener('keydown', close);
      document.removeEventListener('click', close);
    };
  }, []);

  return (
    <details className="account-menu" ref={menu}>
      <summary ref={trigger} aria-label={`${t(locale, 'account')}: ${name}`}>
        <Initials user={user} />
        <span className="account-first-name">{user.first_name}</span>
        <span aria-hidden="true">&#8964;</span>
      </summary>
      <div className="account-popover">
        <p className="account-label">{t(locale, 'signedInAs')}</p>
        <strong>{name}</strong>
        <span dir="auto">{detail}</span>
        <button type="button" onClick={logout} disabled={loggingOut}>
          {t(locale, loggingOut ? 'signingOut' : 'signOut')}
        </button>
      </div>
    </details>
  );
}

function MobileAccount({
  locale,
  user,
  logout,
  loggingOut,
}: {
  locale: Locale;
  user: CurrentUser;
  logout: () => void;
  loggingOut: boolean;
}) {
  const { name, detail } = identity(user);
  return (
    <div className="mobile-account">
      <div className="mobile-account-identity">
        <Initials user={user} />
        <span>
          <strong>{name}</strong>
          <small dir="auto">{detail}</small>
        </span>
      </div>
      <button type="button" onClick={logout} disabled={loggingOut}>
        {t(locale, loggingOut ? 'signingOut' : 'signOut')}
      </button>
    </div>
  );
}

function UnavailableSession({ locale, mobileTargetId }: Pick<Props, 'locale' | 'mobileTargetId'>) {
  const [mobileTarget, setMobileTarget] = useState<HTMLElement | null>(null);
  useEffect(() => setMobileTarget(document.getElementById(mobileTargetId)), [mobileTargetId]);
  const desktop = <AccountFailure locale={locale} retry={() => undefined} />;
  const mobile = <AccountFailure locale={locale} retry={() => undefined} mobile />;
  return (
    <>
      <div className="desktop-session" data-session-state="error">
        {desktop}
      </div>
      {mobileTarget && createPortal(mobile, mobileTarget)}
    </>
  );
}

function AvailableSession({
  locale,
  currentPath: staticPath,
  mobileTargetId,
}: Omit<Props, 'available'>) {
  const [currentPath, setCurrentPath] = useState(staticPath);
  const [mobileTarget, setMobileTarget] = useState<HTMLElement | null>(null);
  const contracts = getAuthContracts();
  const session = useQuery(contracts.session());
  const logout = useMutation(contracts.logout());

  useEffect(() => {
    setCurrentPath(`${window.location.pathname}${window.location.search}`);
    setMobileTarget(document.getElementById(mobileTargetId));
  }, [mobileTargetId]);

  function signOut() {
    document.querySelector<HTMLDetailsElement>('.mobile-navigation')?.removeAttribute('open');
    logout.mutate({});
  }

  let desktop: ReactNode;
  let mobile: ReactNode;
  if (session.isError) {
    const retry = () => session.refetch();
    desktop = <AccountFailure locale={locale} retry={retry} />;
    mobile = <AccountFailure locale={locale} retry={retry} mobile />;
  } else if (session.isPending) {
    desktop = (
      <span className="session-loading" role="status" aria-label={t(locale, 'loadingAccount')} />
    );
    mobile = (
      <span className="mobile-session-loading" role="status">
        {t(locale, 'loadingAccount')}
      </span>
    );
  } else if (session.data.kind === 'authenticated') {
    desktop = (
      <DesktopAccount
        locale={locale}
        user={session.data.user}
        logout={signOut}
        loggingOut={logout.isPending}
      />
    );
    mobile = (
      <MobileAccount
        locale={locale}
        user={session.data.user}
        logout={signOut}
        loggingOut={logout.isPending}
      />
    );
  } else {
    desktop = <Anonymous locale={locale} currentPath={currentPath} />;
    mobile = <Anonymous locale={locale} currentPath={currentPath} mobile />;
  }

  return (
    <>
      <div className="desktop-session" data-session-state={session.status}>
        {desktop}
      </div>
      {mobileTarget && createPortal(mobile, mobileTarget)}
    </>
  );
}

export default function HeaderSession(props: Props) {
  if (!props.available)
    return <UnavailableSession locale={props.locale} mobileTargetId={props.mobileTargetId} />;
  return (
    <QueryClientProvider client={getQueryClient()}>
      <AvailableSession
        locale={props.locale}
        currentPath={props.currentPath}
        mobileTargetId={props.mobileTargetId}
      />
    </QueryClientProvider>
  );
}
