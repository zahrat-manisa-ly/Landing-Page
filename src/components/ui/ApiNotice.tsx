import { t } from '../../i18n/index';
import type { Locale } from '../../lib/domain/types';
import { errorCode } from '../../lib/api/errors';
export function ApiNotice({
  locale,
  error,
  onRetry,
}: {
  locale: Locale;
  error: unknown;
  onRetry?: () => void;
}) {
  const code = errorCode(error);
  return (
    <section className="notice" role="status" aria-live="polite">
      <h2>{t(locale, 'requestFailed')}</h2>
      <p>{t(locale, code)}</p>
      {onRetry && code !== 'configuration' && (
        <button className="btn btn-secondary" type="button" onClick={onRetry}>
          {t(locale, 'retry')}
        </button>
      )}
    </section>
  );
}
export function LoadingFlights({ locale }: { locale: Locale }) {
  return (
    <div aria-busy="true" role="status">
      <p className="mb-5 text-sm text-muted">{t(locale, 'loading')}</p>
      <div aria-hidden="true" className="grid gap-6">
        {[0, 1, 2].map((n) => (
          <div key={n} className="panel min-h-56 p-6">
            <div className="skeleton h-5 w-1/3" />
            <div className="mt-12 flex justify-between gap-4">
              <div className="skeleton h-8 w-1/4" />
              <div className="skeleton h-8 w-1/5" />
            </div>
            <div className="skeleton mt-10 h-4 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}
