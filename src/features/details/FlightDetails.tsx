import { useEffect, useId, useMemo, useState } from 'react';
import type { ApiConfig } from '../../lib/api/config';
import { flightService } from '../../lib/api/flights';
import { isAbort } from '../../lib/api/errors';
import type { Fare, FlightOffer, Journey, Locale } from '../../lib/domain/types';
import { duration, flightTime, money } from '../../lib/domain/format';
import { isBookable } from '../../lib/domain/results';
import { route, t } from '../../i18n/index';
import { ApiNotice, LoadingFlights } from '../../components/ui/ApiNotice';
function JourneyTimeline({
  journey,
  locale,
  index,
}: {
  journey: Journey;
  locale: Locale;
  index: number;
}) {
  return (
    <section className="journey-timeline panel">
      <h2 className="eyebrow">
        {t(locale, 'journey')} / {t(locale, index === 0 ? 'outbound' : 'inbound')}
      </h2>
      <p className="timeline-description">{t(locale, 'localTimes')}</p>
      <ol className="timeline-segments">
        {journey.segments.map((segment) => (
          <li key={segment.id}>
            <div className="timeline-stop">
              <time dateTime={segment.departureAt}>
                {flightTime(segment.departureAt, segment.origin.timeZone, locale)}
              </time>
              <div>
                <h3>
                  {segment.origin.name} <bdi>({segment.origin.code})</bdi>
                </h3>
                {segment.departureTerminal && (
                  <p>
                    {t(locale, 'terminal')}: {segment.departureTerminal}
                  </p>
                )}
                <p>
                  {new Intl.DateTimeFormat(locale, {
                    day: 'numeric',
                    month: 'short',
                    timeZone: segment.origin.timeZone,
                  }).format(new Date(segment.departureAt))}
                </p>
              </div>
            </div>
            <div className="timeline-flight">
              <span>{t(locale, 'inFlight')}</span>
              <div>
                <strong>
                  {segment.airlineName} &middot; {t(locale, 'flight')}{' '}
                  <bdi>{segment.flightNumber}</bdi>
                </strong>
                <p>{duration(segment.durationMinutes, locale)}</p>
              </div>
            </div>
            <div className="timeline-stop">
              <time dateTime={segment.arrivalAt}>
                {flightTime(segment.arrivalAt, segment.destination.timeZone, locale)}
              </time>
              <div>
                <h3>
                  {segment.destination.name} <bdi>({segment.destination.code})</bdi>
                </h3>
                {segment.arrivalTerminal && (
                  <p>
                    {t(locale, 'terminal')}: {segment.arrivalTerminal}
                  </p>
                )}
                <p>
                  {new Intl.DateTimeFormat(locale, {
                    day: 'numeric',
                    month: 'short',
                    timeZone: segment.destination.timeZone,
                  }).format(new Date(segment.arrivalAt))}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
function FareSummary({
  offer,
  selected,
  locale,
  available,
}: {
  offer: FlightOffer;
  selected: Fare | undefined;
  locale: Locale;
  available: boolean;
}) {
  const first = offer.journeys[0]!.segments[0]!,
    lastJourney = offer.journeys[0]!,
    last = lastJourney.segments[lastJourney.segments.length - 1]!;
  const price = selected?.price ?? offer.price,
    scope = selected?.priceScope ?? offer.priceScope;
  return (
    <aside className="selection-summary">
      <h2 className="eyebrow">{t(locale, 'selection')}</h2>
      <p className="selection-route">
        {first.origin.city} <span aria-hidden="true">{locale === 'ar' ? '\u2190' : '\u2192'}</span>{' '}
        {last.destination.city}
      </p>
      <p className="selection-caption">
        {t(locale, offer.cabin)}
        {selected ? ` / ${selected.name}` : ''}
      </p>
      <div className="selection-price" aria-live="polite">
        <span>{t(locale, 'fareEstimate')}</span>
        <p>
          <bdi>{money(price, locale)}</bdi>
        </p>
        <span>{t(locale, scope === 'per-adult' ? 'perAdult' : 'total')}</span>
      </div>
      {!available && (
        <p className="field-error" role="status">
          {Date.parse(offer.expiresAt) <= Date.now()
            ? t(locale, 'expiredOffer')
            : t(locale, 'unavailable')}
        </p>
      )}
      <p className="selection-caveat">{t(locale, 'fareCaveat')}</p>
      <button
        type="button"
        className="btn btn-primary w-full"
        disabled
        aria-describedby="checkout-pending"
      >
        {t(locale, 'continueTravelers')}{' '}
        <span aria-hidden="true">{locale === 'ar' ? '\u2190' : '\u2192'}</span>
      </button>
      <p id="checkout-pending" className="selection-caveat">
        {t(locale, 'checkoutPending')}
      </p>
    </aside>
  );
}
export default function FlightDetails({
  locale,
  config,
  planeAvailable,
}: {
  locale: Locale;
  config: ApiConfig;
  planeAvailable: boolean;
}) {
  const id = useId();
  const service = useMemo(() => flightService(config, locale), [config, locale]);
  const [offerId, setOfferId] = useState<string | null>(null),
    [missing, setMissing] = useState(false),
    [offer, setOffer] = useState<FlightOffer | null>(null),
    [error, setError] = useState<unknown>(null),
    [loading, setLoading] = useState(true),
    [selectedId, setSelectedId] = useState(''),
    [attempt, setAttempt] = useState(0),
    [now, setNow] = useState(0),
    [backQuery, setBackQuery] = useState('');
  useEffect(() => {
    const params = new URLSearchParams(window.location.search),
      key = params.get('id');
    params.delete('id');
    setBackQuery(params.toString());
    setOfferId(key);
    setMissing(!key);
    if (!key) setLoading(false);
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!offerId) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setOffer(null);
    setSelectedId('');
    service
      .offer(offerId, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setOffer(result);
          setSelectedId(result.fares.find((f) => f.available)?.id ?? '');
        }
      })
      .catch((e) => {
        if (!isAbort(e) && !controller.signal.aborted) setError(e);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [offerId, service, attempt]);
  const selected = offer?.fares.find((f) => f.id === selectedId);
  const available = !!offer && isBookable(offer, now);
  if (missing)
    return (
      <section className="notice">
        <h2>{t(locale, 'missingOffer')}</h2>
        <a className="btn btn-primary" href={route(locale, 'flights')}>
          {t(locale, 'searchAgain')}
        </a>
      </section>
    );
  if (loading) return <LoadingFlights locale={locale} />;
  if (error)
    return <ApiNotice locale={locale} error={error} onRetry={() => setAttempt((x) => x + 1)} />;
  if (!offer) return null;
  return (
    <div className="flight-details">
      <a
        className="details-back"
        href={`${route(locale, 'flights/results')}${backQuery ? `?${backQuery}` : ''}`}
      >
        {locale === 'ar' ? '\u2192' : '\u2190'} {t(locale, 'backResults')}
      </a>
      {offer.journeys.map((journey, index) => {
        const first = journey.segments[0]!,
          last = journey.segments[journey.segments.length - 1]!;
        return (
          <section key={journey.id} className="itinerary-overview panel">
            <div className="itinerary-identity">
              <span>
                {offer.airlineName} &middot; {t(locale, offer.cabin)}
                {offer.journeys.length > 1
                  ? ` / ${t(locale, index === 0 ? 'outbound' : 'inbound')}`
                  : ''}
              </span>
              <span className="overview-date">
                {new Intl.DateTimeFormat(locale, {
                  day: 'numeric',
                  month: 'short',
                  timeZone: first.origin.timeZone,
                }).format(new Date(first.departureAt))}
              </span>
            </div>
            <div className="overview-route" dir="ltr">
              <div>
                <strong className="overview-city">{first.origin.city}</strong>
                <strong className="overview-time">
                  {flightTime(first.departureAt, first.origin.timeZone, locale)}
                </strong>
                <bdi>{first.origin.code}</bdi>
              </div>
              <div className="overview-path">
                <span>
                  {duration(journey.durationMinutes, locale)} &middot;{' '}
                  {journey.segments.length === 1
                    ? t(locale, 'nonstop')
                    : `${journey.segments.length - 1} ${t(locale, 'stopCount')}`}
                </span>
                <div className="plane-path">
                  <span />
                  {planeAvailable ? (
                    <img src="/design/plane.svg" alt="" width="16" height="16" />
                  ) : (
                    <span className="missing-plane" title={t(locale, 'assetMissing')} />
                  )}
                  <span />
                </div>
              </div>
              <div className="overview-arrival">
                <strong className="overview-city">{last.destination.city}</strong>
                <strong className="overview-time">
                  {flightTime(last.arrivalAt, last.destination.timeZone, locale)}
                </strong>
                <bdi>{last.destination.code}</bdi>
              </div>
            </div>
          </section>
        );
      })}
      <div className="detail-content-grid">
        <div className="timeline-stack">
          {offer.journeys.map((journey, index) => (
            <JourneyTimeline key={journey.id} journey={journey} index={index} locale={locale} />
          ))}
        </div>
        <FareSummary offer={offer} selected={selected} locale={locale} available={available} />
        <section className="fare-comparison">
          <p className="eyebrow">{t(locale, 'selectFare')}</p>
          <h2>{t(locale, 'fareChoice')}</h2>
          <p className="fare-guidance">{t(locale, 'fareGuidance')}</p>
          <fieldset className="fare-options">
            <legend className="sr-only">{t(locale, 'selectFare')}</legend>
            {offer.fares.map((fare) => (
              <label
                className="fare-option panel"
                data-selected={fare.id === selectedId}
                data-unavailable={!available || !fare.available}
                key={fare.id}
              >
                <span className="fare-name">
                  <input
                    type="radio"
                    name={`${id}-fare`}
                    value={fare.id}
                    checked={fare.id === selectedId}
                    disabled={!available || !fare.available}
                    onChange={() => setSelectedId(fare.id)}
                  />
                  {fare.name}
                </span>
                <span className="fare-price">
                  <bdi>{money(fare.price, locale)}</bdi>
                </span>
                <span className="fare-scope">
                  {t(locale, fare.priceScope === 'per-adult' ? 'perAdult' : 'total')}
                </span>
                <span className="fare-inclusion">{fare.cabinBaggage}</span>
              </label>
            ))}
          </fieldset>
          {offer.fares.length === 0 && <p className="notice">{t(locale, 'unavailable')}</p>}
          <p className="fare-qualification">{t(locale, 'checkedCaveat')}</p>
        </section>
        <section className="fare-rules panel">
          <h2 className="eyebrow">{t(locale, 'rules')}</h2>
          {selected ? (
            <dl>
              {(
                [
                  ['cabinBaggage', selected.cabinBaggage],
                  ['checkedBaggage', selected.checkedBaggage],
                  ['changes', selected.changeAndRefundRules],
                ] as const
              ).map(([key, value]) => (
                <div key={key}>
                  <dt>{t(locale, key)}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="py-6 text-sm text-muted">{t(locale, 'selectFare')}</p>
          )}
        </section>
        <section className="detail-caveats">
          <h2 className="eyebrow">{t(locale, 'important')}</h2>
          <p>{t(locale, 'fareCaveat')}</p>
        </section>
      </div>
    </div>
  );
}
