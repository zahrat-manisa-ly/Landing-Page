import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react';
import type { ApiConfig } from '../../lib/api/config';
import { configured } from '../../lib/api/config';
import { flightService } from '../../lib/api/flights';
import {
  defaultSearch,
  localToday,
  searchFromParams,
  searchToParams,
  validateSearch,
  type SearchErrors,
} from '../../lib/domain/search';
import type { AirportSelection, Cabin, Locale, Travelers, TripType } from '../../lib/domain/types';
import { route, t, translate } from '../../i18n/index';
import AirportCombobox from './AirportCombobox';
interface Props {
  locale: Locale;
  config: ApiConfig;
}
export default function FlightSearch({ locale, config }: Props) {
  const id = useId();
  const form = useRef<HTMLFormElement>(null);
  const travelerPanel = useRef<HTMLDetailsElement>(null);
  const service = useMemo(() => flightService(config, locale), [config, locale]);
  const [tripType, setTripType] = useState<TripType>('one-way');
  const [from, setFrom] = useState<AirportSelection | null>(null);
  const [to, setTo] = useState<AirportSelection | null>(null);
  const [departure, setDeparture] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [travelers, setTravelers] = useState<Travelers>({ adults: 1, children: 0, infants: 0 });
  const [cabin, setCabin] = useState<Cabin>('economy');
  const [currency, setCurrency] = useState(config.defaultCurrency);
  const [today, setToday] = useState('');
  const [errors, setErrors] = useState<SearchErrors>({});
  const available = configured(config, 'search') && configured(config, 'airports');
  useEffect(() => {
    setToday(localToday());
    const params = new URLSearchParams(window.location.search);
    if (!params.has('from') && !params.has('to')) return;
    const initial = searchFromParams(params, config.defaultCurrency);
    setFrom(initial.from ? { code: initial.from, label: initial.from } : null);
    setTo(initial.to ? { code: initial.to, label: initial.to } : null);
    setDeparture(initial.departure);
    setReturnDate(initial.returnDate ?? '');
    setTripType(initial.tripType === 'round-trip' ? 'round-trip' : 'one-way');
    setTravelers({
      adults: Number.isFinite(initial.travelers.adults) ? initial.travelers.adults : 1,
      children: Number.isFinite(initial.travelers.children) ? initial.travelers.children : 0,
      infants: Number.isFinite(initial.travelers.infants) ? initial.travelers.infants : 0,
    });
    setCabin(
      ['economy', 'premium-economy', 'business', 'first'].includes(initial.cabin)
        ? initial.cabin
        : 'economy',
    );
    setCurrency(/^[A-Z]{3}$/.test(initial.currency) ? initial.currency : config.defaultCurrency);
  }, [config.defaultCurrency]);
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!available) return;
    const search = {
      ...defaultSearch(currency),
      tripType,
      from: from?.code ?? '',
      to: to?.code ?? '',
      departure,
      returnDate,
      travelers,
      cabin,
    };
    const next = validateSearch(search);
    setErrors(next);
    if (Object.keys(next).length) {
      if (next.travelers || next.cabin) {
        if (travelerPanel.current) travelerPanel.current.open = true;
      }
      requestAnimationFrame(() =>
        form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
      );
      return;
    }
    window.location.assign(`${route(locale, 'flights/results')}?${searchToParams(search)}`);
  }
  const total = travelers.adults + travelers.children + travelers.infants;
  return (
    <form
      ref={form}
      className="flight-search"
      onSubmit={submit}
      noValidate
      aria-labelledby={`${id}-title`}
    >
      <div className="search-top">
        <h2 id={`${id}-title`}>
          <span className="search-title-desktop">{t(locale, 'searchTitle')}</span>
          <span className="search-title-mobile">{t(locale, 'searchTitleMobile')}</span>
        </h2>
        <fieldset className="trip-types">
          <legend className="sr-only">{t(locale, 'validTrip')}</legend>
          {(['one-way', 'round-trip'] as const).map((value) => (
            <label key={value}>
              <input
                type="radio"
                name={`${id}-trip`}
                value={value}
                checked={tripType === value}
                onChange={() => {
                  setTripType(value);
                  if (value === 'one-way')
                    setErrors((current) => {
                      const next = { ...current };
                      delete next.returnDate;
                      return next;
                    });
                }}
              />
              {t(locale, value === 'one-way' ? 'oneWay' : 'roundTrip')}
            </label>
          ))}
        </fieldset>
        <span className="search-cabin-caption">
          {t(locale, cabin)} &middot; {currency}
        </span>
      </div>
      <div className="search-fields">
        <AirportCombobox
          locale={locale}
          name="from"
          value={from}
          onChange={setFrom}
          lookup={service.airports}
          enabled={configured(config, 'airports')}
          error={errors.from}
        />
        <AirportCombobox
          locale={locale}
          name="to"
          value={to}
          onChange={setTo}
          lookup={service.airports}
          enabled={configured(config, 'airports')}
          error={errors.to}
        />
        <div className="date-field">
          <label className="field" data-invalid={!!errors.departure}>
            <span className="field-label">{t(locale, 'depart')}</span>
            <input
              name="departure"
              type="date"
              value={departure}
              min={today || undefined}
              required
              aria-invalid={!!errors.departure}
              aria-describedby={errors.departure ? `${id}-depart-error` : undefined}
              onChange={(e) => setDeparture(e.target.value)}
            />
          </label>
          {errors.departure && (
            <p className="field-error" id={`${id}-depart-error`}>
              {translate(locale, errors.departure)}
            </p>
          )}
        </div>
        <div className="date-field">
          <label className="field" data-invalid={!!errors.returnDate}>
            <span className="field-label">{t(locale, 'returnDate')}</span>
            <input
              name="returnDate"
              type="date"
              disabled={tripType === 'one-way'}
              value={tripType === 'round-trip' ? returnDate : ''}
              min={departure || today || undefined}
              required={tripType === 'round-trip'}
              aria-label={
                tripType === 'one-way'
                  ? `${t(locale, 'returnDate')}: ${t(locale, 'roundTripOnly')}`
                  : t(locale, 'returnDate')
              }
              aria-invalid={!!errors.returnDate}
              aria-describedby={errors.returnDate ? `${id}-return-error` : undefined}
              onChange={(e) => setReturnDate(e.target.value)}
            />
          </label>
          {errors.returnDate && (
            <p className="field-error" id={`${id}-return-error`}>
              {translate(locale, errors.returnDate)}
            </p>
          )}
        </div>
        <div className="travelers-field">
          <details
            ref={travelerPanel}
            onKeyDown={(e) => {
              if (e.key === 'Escape' && travelerPanel.current) {
                travelerPanel.current.open = false;
                travelerPanel.current.querySelector('summary')?.focus();
              }
            }}
          >
            <summary
              className="field"
              aria-invalid={!!errors.travelers || !!errors.cabin}
              aria-describedby={errors.travelers ? `${id}-travelers-error` : undefined}
            >
              <span className="field-label">{t(locale, 'travelers')}</span>
              <span className="travelers-value">
                {total} {t(locale, 'travelers')}
                <span aria-hidden="true">&#8964;</span>
              </span>
            </summary>
            <div className="traveler-options">
              {(['adults', 'children', 'infants'] as const).map((key) => (
                <label key={key} className="traveler-counter">
                  <span>{t(locale, key)}</span>
                  <input
                    aria-label={t(locale, key)}
                    name={key}
                    type="number"
                    min={key === 'adults' ? 1 : 0}
                    max={key === 'infants' ? travelers.adults : 9}
                    value={Number.isNaN(travelers[key]) ? '' : travelers[key]}
                    onChange={(e) =>
                      setTravelers((current) => ({ ...current, [key]: e.target.valueAsNumber }))
                    }
                  />
                </label>
              ))}
              <label className="cabin-select">
                <span>{t(locale, 'cabin')}</span>
                <select
                  name="cabin"
                  value={cabin}
                  onChange={(e) => setCabin(e.target.value as Cabin)}
                >
                  {(['economy', 'premium-economy', 'business', 'first'] as const).map((value) => (
                    <option value={value} key={value}>
                      {t(locale, value)}
                    </option>
                  ))}
                </select>
              </label>
              <p className="text-xs text-muted">{t(locale, 'travelerHint')}</p>
              <button
                type="button"
                className="btn btn-secondary mt-4 w-full"
                onClick={() => {
                  if (travelerPanel.current) {
                    travelerPanel.current.open = false;
                    travelerPanel.current.querySelector('summary')?.focus();
                  }
                }}
              >
                {t(locale, 'done')}
              </button>
            </div>
          </details>
          {errors.travelers && (
            <p className="field-error" id={`${id}-travelers-error`}>
              {translate(locale, errors.travelers)}
            </p>
          )}
        </div>
        <button
          className="btn btn-primary search-submit"
          type="submit"
          disabled={!available}
          aria-describedby={!available ? `${id}-connection` : undefined}
        >
          <span className="search-title-desktop">{t(locale, 'search')}</span>
          <span className="search-title-mobile">{t(locale, 'searchTitle')}</span>
          <span aria-hidden="true">{locale === 'ar' ? '\u2190' : '\u2192'}</span>
        </button>
      </div>
      {Object.keys(errors).length > 0 && (
        <p className="field-error mt-4" role="alert">
          {t(locale, 'checkFields')}
        </p>
      )}
      <p className="search-inventory">{t(locale, 'inventoryNote')}</p>
      {!available && (
        <p className="connection-note" id={`${id}-connection`} role="status">
          {t(locale, 'configuration')}
        </p>
      )}
    </form>
  );
}
