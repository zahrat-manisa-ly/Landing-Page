import { t, route } from '../../i18n/index';
import type { FlightOffer, Locale } from '../../lib/domain/types';
import { arrivalDayDifference, duration, flightTime, money } from '../../lib/domain/format';
import { isBookable } from '../../lib/domain/results';
export default function FlightCard({
  offer,
  locale,
  now,
  searchQuery,
}: {
  offer: FlightOffer;
  locale: Locale;
  now: number;
  searchQuery: string;
}) {
  const available = isBookable(offer, now);
  const query = new URLSearchParams(searchQuery);
  query.set('id', offer.id);
  return (
    <article className="flight-card" aria-label={offer.airlineName}>
      <div className="flight-card-main">
        {offer.badge && <p className="eyebrow">{offer.badge}</p>}
        <h3>
          {offer.airlineName} <span aria-hidden="true">&middot;</span> {t(locale, offer.cabin)}
        </h3>
        {offer.journeys.map((journey, index) => {
          const first = journey.segments[0]!,
            last = journey.segments[journey.segments.length - 1]!;
          const days = arrivalDayDifference(
            first.departureAt,
            last.arrivalAt,
            first.origin.timeZone,
            last.destination.timeZone,
          );
          return (
            <div className="card-journey" key={journey.id}>
              {offer.journeys.length > 1 && (
                <p className="journey-caption">{t(locale, index === 0 ? 'outbound' : 'inbound')}</p>
              )}
              <div className="card-schedule" dir="ltr">
                <div className="card-time">
                  <time dateTime={first.departureAt}>
                    {flightTime(first.departureAt, first.origin.timeZone, locale)}
                  </time>
                  <bdi>{first.origin.code}</bdi>
                </div>
                <div className="card-duration">
                  <span>{duration(journey.durationMinutes, locale)}</span>
                  <span className="desktop-stops">
                    {journey.segments.length === 1
                      ? t(locale, 'nonstop')
                      : `${journey.segments.length - 1} ${t(locale, 'stopCount')}`}
                  </span>
                </div>
                <div className="card-time">
                  <time dateTime={last.arrivalAt}>
                    {flightTime(last.arrivalAt, last.destination.timeZone, locale)}
                    {days !== 0 && (
                      <sup className="text-xs">
                        {days > 0 ? '+' : ''}
                        {days}
                      </sup>
                    )}
                  </time>
                  <bdi>{last.destination.code}</bdi>
                </div>
              </div>
              <p className="mobile-stops">
                {journey.segments.length === 1
                  ? t(locale, 'nonstop')
                  : `${journey.segments.length - 1} ${t(locale, 'stopCount')}`}
              </p>
            </div>
          );
        })}
        <p className="card-baggage">
          {offer.cabinBagIncluded ? t(locale, 'cabinIncluded') : t(locale, 'checkFare')}
        </p>
      </div>
      <div className="flight-card-price">
        <div>
          <p className="price">
            <bdi>{money(offer.price, locale)}</bdi>
          </p>
          <p className="price-caption">
            {t(locale, offer.priceScope === 'per-adult' ? 'perAdult' : 'total')}
          </p>
        </div>
        {available ? (
          <a className="btn btn-primary" href={`${route(locale, 'flights/offer')}?${query}`}>
            {t(locale, 'viewDetails')}{' '}
            <span aria-hidden="true">{locale === 'ar' ? '\u2190' : '\u2192'}</span>
          </a>
        ) : (
          <span className="btn btn-secondary" aria-disabled="true">
            {t(locale, 'unavailable')}
          </span>
        )}
      </div>
    </article>
  );
}
