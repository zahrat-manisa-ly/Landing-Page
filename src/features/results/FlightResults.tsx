import { useEffect, useMemo, useRef, useState } from 'react';
import type { ApiConfig } from '../../lib/api/config';
import { ApiError, isAbort } from '../../lib/api/errors';
import { flightService } from '../../lib/api/flights';
import { activeFilterCount, filterAndSort, mergeOffers } from '../../lib/domain/results';
import {
  filterStateFromParams,
  searchFromParams,
  searchToParams,
  validateSearch,
  writeFilterParams,
} from '../../lib/domain/search';
import { calendarDate } from '../../lib/domain/format';
import {
  EMPTY_FILTERS,
  type Filters,
  type FlightSearch,
  type Locale,
  type SearchResponse,
  type SortOrder,
} from '../../lib/domain/types';
import { route, t } from '../../i18n/index';
import { ApiNotice, LoadingFlights } from '../../components/ui/ApiNotice';
import FlightCard from './FlightCard';
import FiltersPanel from './FiltersPanel';
export default function FlightResults({ locale, config }: { locale: Locale; config: ApiConfig }) {
  const service = useMemo(() => flightService(config, locale), [config, locale]);
  const [search, setSearch] = useState<FlightSearch | null>(null),
    [invalid, setInvalid] = useState(false),
    [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState<unknown>(null),
    [moreError, setMoreError] = useState<unknown>(null),
    [moreBusy, setMoreBusy] = useState(false),
    [attempt, setAttempt] = useState(0);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS),
    [sort, setSort] = useState<SortOrder>('recommended'),
    [draft, setDraft] = useState<Filters>(EMPTY_FILTERS),
    [now, setNow] = useState(0);
  const drawer = useRef<HTMLDialogElement>(null),
    trigger = useRef<HTMLButtonElement>(null),
    moreController = useRef<AbortController | null>(null),
    generation = useRef(0);
  useEffect(() => {
    const read = () => {
      const params = new URLSearchParams(window.location.search),
        parsed = searchFromParams(params, config.defaultCurrency),
        bad = Object.keys(validateSearch(parsed)).length > 0;
      setInvalid(bad);
      setSearch((current) =>
        bad ? null : JSON.stringify(current) === JSON.stringify(parsed) ? current : parsed,
      );
      const state = filterStateFromParams(params);
      setFilters(state.filters);
      setSort(state.sort);
      if (bad) setLoading(false);
    };
    read();
    window.addEventListener('popstate', read);
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => {
      window.removeEventListener('popstate', read);
      clearInterval(timer);
      moreController.current?.abort();
    };
  }, [config.defaultCurrency]);
  useEffect(() => {
    const version = ++generation.current;
    moreController.current?.abort();
    setMoreBusy(false);
    setMoreError(null);
    setData(null);
    setError(null);
    if (!search) return;
    const controller = new AbortController();
    setLoading(true);
    service
      .search(search, controller.signal)
      .then((response) => {
        if (!controller.signal.aborted && version === generation.current) setData(response);
      })
      .catch((e) => {
        if (!isAbort(e) && !controller.signal.aborted && version === generation.current)
          setError(e);
      })
      .finally(() => {
        if (!controller.signal.aborted && version === generation.current) setLoading(false);
      });
    return () => controller.abort();
  }, [search, service, attempt]);
  const offers = data?.offers ?? [];
  const comparable =
    new Set(offers.map((o) => `${o.price.currency}:${o.price.decimals}:${o.priceScope}`)).size <= 1;
  const effectiveSort = !comparable && sort === 'cheapest' ? 'recommended' : sort;
  const visible = useMemo(
    () => filterAndSort(offers, filters, effectiveSort),
    [offers, filters, effectiveSort],
  );
  const airlines = [...new Set(offers.map((offer) => offer.airlineName))];
  function update(value: Filters, order = sort) {
    setFilters(value);
    setSort(order);
    const params = writeFilterParams(new URLSearchParams(window.location.search), value, order);
    window.history.pushState(null, '', `${window.location.pathname}?${params}`);
  }
  function closeDrawer() {
    drawer.current?.close();
    trigger.current?.focus();
  }
  async function more() {
    if (!data?.nextCursor || !search || moreBusy) return;
    const cursor = data.nextCursor,
      version = generation.current,
      controller = new AbortController();
    moreController.current = controller;
    setMoreBusy(true);
    setMoreError(null);
    try {
      const response = await service.search(search, controller.signal, cursor);
      if (controller.signal.aborted || version !== generation.current) return;
      const merged = mergeOffers(data.offers, response.offers);
      if (response.nextCursor === cursor || response.total < merged.length)
        throw new ApiError('invalidResponse');
      setData({ ...response, offers: merged });
    } catch (e) {
      if (!isAbort(e) && !controller.signal.aborted && version === generation.current)
        setMoreError(e);
    } finally {
      if (!controller.signal.aborted && version === generation.current) setMoreBusy(false);
    }
  }
  const searchQuery = search ? searchToParams(search).toString() : '';
  const sortControl = (id: string) => (
    <label className="sort-select" htmlFor={id}>
      <span>{t(locale, 'sortBy')}</span>
      <select
        id={id}
        value={effectiveSort}
        onChange={(e) => update(filters, e.target.value as SortOrder)}
      >
        {(['recommended', 'cheapest', 'fastest'] as const).map((key) => (
          <option value={key} key={key} disabled={key === 'cheapest' && !comparable}>
            {t(locale, key)}
          </option>
        ))}
      </select>
    </label>
  );
  if (invalid)
    return (
      <div className="site-container pb-20">
        <section className="notice">
          <h2>{t(locale, 'invalidSearch')}</h2>
          <a className="btn btn-primary" href={route(locale, 'flights')}>
            {t(locale, 'searchAgain')}
          </a>
        </section>
      </div>
    );
  return (
    <div className="site-container results-shell">
      {search && (
        <section className="trip-summary panel">
          <div>
            <p className="eyebrow">{t(locale, 'tripSummary')}</p>
            <h2>
              <bdi>{search.from}</bdi>{' '}
              <span aria-hidden="true">{locale === 'ar' ? '\u2190' : '\u2192'}</span>{' '}
              <bdi>{search.to}</bdi>
            </h2>
            <p className="trip-meta">
              {t(locale, search.tripType === 'one-way' ? 'oneWay' : 'roundTrip')} &middot;{' '}
              {calendarDate(search.departure, locale)}
              {search.tripType === 'round-trip' && search.returnDate
                ? ` / ${calendarDate(search.returnDate, locale)}`
                : ''}{' '}
              &middot;{' '}
              {search.travelers.adults + search.travelers.children + search.travelers.infants}{' '}
              {t(locale, 'travelers')} &middot; {t(locale, search.cabin)}
            </p>
          </div>
          <a className="btn btn-secondary" href={`${route(locale, 'flights')}?${searchQuery}`}>
            {t(locale, 'editSearch')}{' '}
            <span aria-hidden="true">{locale === 'ar' ? '\u2190' : '\u2192'}</span>
          </a>
        </section>
      )}
      <div className="results-workspace">
        <aside className="desktop-filters panel">
          <FiltersPanel
            locale={locale}
            filters={filters}
            airlines={airlines}
            onChange={(value) => update(value)}
            onReset={() => update(EMPTY_FILTERS)}
          />
        </aside>
        <section className="results-list" aria-label={t(locale, 'availableFlights')}>
          <div className="mobile-filter-bar">
            <button
              ref={trigger}
              className="btn btn-secondary"
              type="button"
              onClick={() => {
                setDraft({
                  ...filters,
                  airlines: [...filters.airlines],
                  departureWindows: [...filters.departureWindows],
                });
                drawer.current?.showModal();
              }}
            >
              {t(locale, 'filters')} ({activeFilterCount(filters)})
            </button>
            {sortControl('mobile-sort')}
          </div>
          <div className="results-heading">
            <h2>{t(locale, 'availableFlights')}</h2>
            <p aria-live="polite">
              {data
                ? `${visible.length} ${t(locale, 'loadedFlights')} / ${data.total}`
                : t(locale, 'inventoryNote')}
            </p>
          </div>
          <div className="desktop-sort">{sortControl('desktop-sort')}</div>
          {data && data.nextCursor && (
            <p className="my-4 text-xs text-muted">{t(locale, 'loadedNotice')}</p>
          )}
          {!comparable && (
            <p className="my-4 text-xs text-muted">{t(locale, 'priceBasisNotice')}</p>
          )}
          <div className="flight-options">
            {loading ? (
              <LoadingFlights locale={locale} />
            ) : error ? (
              <ApiNotice locale={locale} error={error} onRetry={() => setAttempt((x) => x + 1)} />
            ) : data && visible.length === 0 ? (
              <section className="notice" role="status">
                <h2>{t(locale, 'noFlights')}</h2>
                <p>{t(locale, 'noFlightsText')}</p>
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={() => update(EMPTY_FILTERS)}
                >
                  {t(locale, 'resetFilters')}
                </button>
              </section>
            ) : (
              visible.map((offer) => (
                <FlightCard
                  key={offer.id}
                  offer={offer}
                  locale={locale}
                  now={now}
                  searchQuery={searchQuery}
                />
              ))
            )}
          </div>
          {moreError !== null && (
            <div className="mt-6">
              <ApiNotice locale={locale} error={moreError} onRetry={more} />
            </div>
          )}
          {data?.nextCursor && !loading && (
            <button
              type="button"
              className="btn btn-secondary mt-6 w-full"
              disabled={moreBusy}
              onClick={more}
            >
              {t(locale, moreBusy ? 'loading' : 'loadMore')}
            </button>
          )}
        </section>
      </div>
      <section className="fare-notice panel">
        <h2 className="eyebrow">{t(locale, 'fareNoticeTitle')}</h2>
        <p>{t(locale, 'fareNotice')}</p>
      </section>
      <dialog
        ref={drawer}
        className="filter-dialog"
        aria-label={t(locale, 'filters')}
        onClose={() => trigger.current?.focus()}
        onClick={(event) => {
          if (event.target === drawer.current) closeDrawer();
        }}
      >
        <div className="filter-dialog-content">
          <button type="button" className="dialog-close btn btn-secondary" onClick={closeDrawer}>
            {t(locale, 'close')} <span aria-hidden="true">&times;</span>
          </button>
          <FiltersPanel
            locale={locale}
            filters={draft}
            airlines={airlines}
            onChange={setDraft}
            onReset={() => setDraft(EMPTY_FILTERS)}
          />
          <button
            type="button"
            className="btn btn-primary w-full"
            onClick={() => {
              update(draft);
              closeDrawer();
            }}
          >
            {t(locale, 'applyFilters')}
          </button>
        </div>
      </dialog>
    </div>
  );
}
