import { useId } from 'react';
import type { Filters, Locale } from '../../lib/domain/types';
import { t } from '../../i18n/index';
interface Props {
  locale: Locale;
  filters: Filters;
  airlines: string[];
  onChange: (value: Filters) => void;
  onReset: () => void;
}
export default function FiltersPanel({ locale, filters, airlines, onChange, onReset }: Props) {
  const id = useId();
  const toggle = <T,>(items: T[], value: T) =>
    items.includes(value) ? items.filter((x) => x !== value) : [...items, value];
  return (
    <div className="filters-panel">
      <div className="filter-heading">
        <h2>{t(locale, 'refine')}</h2>
        <button type="button" onClick={onReset}>
          {t(locale, 'reset')}
        </button>
      </div>
      <fieldset>
        <legend>{t(locale, 'stops')}</legend>
        {(['any', 'nonstop', 'one-stop'] as const).map((value) => (
          <label key={value}>
            <input
              type="radio"
              name={`${id}-stops`}
              checked={filters.stops === value}
              onChange={() => onChange({ ...filters, stops: value })}
            />
            {t(locale, value === 'one-stop' ? 'oneStop' : value)}
          </label>
        ))}
      </fieldset>
      <fieldset>
        <legend>{t(locale, 'departureTime')}</legend>
        {(['early', 'morning', 'afternoon', 'evening'] as const).map((key, index) => (
          <label key={key}>
            <input
              type="checkbox"
              checked={filters.departureWindows.includes(index)}
              onChange={() =>
                onChange({ ...filters, departureWindows: toggle(filters.departureWindows, index) })
              }
            />
            {t(locale, key)}
          </label>
        ))}
      </fieldset>
      <fieldset>
        <legend>{t(locale, 'airlines')}</legend>
        {airlines.length ? (
          airlines.map((name) => (
            <label key={name}>
              <input
                type="checkbox"
                checked={filters.airlines.includes(name)}
                onChange={() => onChange({ ...filters, airlines: toggle(filters.airlines, name) })}
              />
              {name}
            </label>
          ))
        ) : (
          <p className="text-xs text-muted">{t(locale, 'allAirlines')}</p>
        )}
      </fieldset>
      <fieldset>
        <legend>{t(locale, 'baggage')}</legend>
        <label>
          <input
            type="checkbox"
            checked={filters.cabinBag}
            onChange={(e) => onChange({ ...filters, cabinBag: e.target.checked })}
          />
          {t(locale, 'cabinBag')}
        </label>
        <label>
          <input
            type="checkbox"
            checked={filters.checkedBag}
            onChange={(e) => onChange({ ...filters, checkedBag: e.target.checked })}
          />
          {t(locale, 'checkedBag')}
        </label>
      </fieldset>
    </div>
  );
}
