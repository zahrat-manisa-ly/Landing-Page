import { useEffect, useId, useRef, useState } from 'react';
import type { Airport, AirportSelection, Locale } from '../../lib/domain/types';
import { t, translate } from '../../i18n/index';
import { errorCode, isAbort } from '../../lib/api/errors';
interface Props {
  locale: Locale;
  name: 'from' | 'to';
  value: AirportSelection | null;
  onChange: (airport: AirportSelection | null) => void;
  lookup: (query: string, signal: AbortSignal) => Promise<Airport[]>;
  error?: string;
  enabled: boolean;
}
export default function AirportCombobox({
  locale,
  name,
  value,
  onChange,
  lookup,
  error,
  enabled,
}: Props) {
  const id = useId();
  const [query, setQuery] = useState(value?.label ?? '');
  const [open, setOpen] = useState(false);
  const [airports, setAirports] = useState<Airport[]>([]);
  const [active, setActive] = useState(-1);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const revision = useRef(0);
  useEffect(() => {
    if (value) {
      setQuery(value.label);
      setOpen(false);
    }
  }, [value?.code, value?.label]);
  useEffect(() => {
    const version = ++revision.current;
    setAirports([]);
    setActive(-1);
    setFailure(null);
    setBusy(false);
    if (!open || !enabled || query.trim().length < 2 || query === value?.label) return;
    const controller = new AbortController();
    setBusy(true);
    const timeout = window.setTimeout(() => {
      lookup(query.trim(), controller.signal)
        .then((items) => {
          if (!controller.signal.aborted && version === revision.current) setAirports(items);
        })
        .catch((e) => {
          if (!isAbort(e) && !controller.signal.aborted && version === revision.current)
            setFailure(errorCode(e));
        })
        .finally(() => {
          if (!controller.signal.aborted && version === revision.current) setBusy(false);
        });
    }, 300);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query, open, enabled, lookup, value?.label]);
  function choose(airport: Airport) {
    setQuery(`${airport.city} (${airport.code})`);
    onChange({ code: airport.code, label: `${airport.city} (${airport.code})` });
    setOpen(false);
  }
  const show = open && query.length >= 2 && !value;
  return (
    <div className="airport-field">
      <div className="field" data-invalid={!!error}>
        <label className="field-label" htmlFor={id}>
          {t(locale, name)}
        </label>
        <input
          id={id}
          name={name}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={show}
          aria-controls={`${id}-options`}
          aria-activedescendant={show && active >= 0 ? `${id}-option-${active}` : undefined}
          autoComplete="off"
          spellCheck={false}
          value={query}
          aria-invalid={!!error}
          aria-describedby={`${id}-help${error ? ` ${id}-error` : ''}`}
          placeholder={t(locale, name === 'from' ? 'airportPlaceholder' : 'destinationPlaceholder')}
          onChange={(event) => {
            setQuery(event.target.value);
            onChange(null);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setOpen(false);
              return;
            }
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault();
              setOpen(true);
              setActive((current) =>
                airports.length === 0
                  ? -1
                  : event.key === 'ArrowDown'
                    ? (current + 1) % airports.length
                    : (current - 1 + airports.length) % airports.length,
              );
            }
            if (event.key === 'Enter' && show) {
              event.preventDefault();
              const airport = airports[active];
              if (airport) choose(airport);
            }
          }}
        />
      </div>
      <span id={`${id}-help`} className="sr-only">
        {enabled ? t(locale, 'airportHint') : t(locale, 'configuration')}
      </span>
      {error && (
        <p id={`${id}-error`} className="field-error">
          {translate(locale, error)}
        </p>
      )}
      {show && (
        <div className="airport-options">
          <ul id={`${id}-options`} role="listbox" aria-label={t(locale, name)}>
            {airports.map((airport, index) => (
              <li
                key={airport.code}
                id={`${id}-option-${index}`}
                role="option"
                aria-selected={active === index}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(index)}
                onClick={() => choose(airport)}
              >
                <span className="font-semibold">
                  {airport.city} <bdi>({airport.code})</bdi>
                </span>
                <span className="block text-xs text-muted">{airport.name}</span>
              </li>
            ))}
          </ul>
          <div className="text-xs text-muted" role="status" aria-live="polite">
            {!enabled
              ? t(locale, 'configuration')
              : busy
                ? t(locale, 'loadingAirports')
                : failure
                  ? translate(locale, failure)
                  : airports.length === 0
                    ? t(locale, 'noAirports')
                    : null}
          </div>
        </div>
      )}
    </div>
  );
}
