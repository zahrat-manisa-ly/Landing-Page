import type { Locale, Money } from './types.ts';
export function money(value: Money, locale: Locale = 'en'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: value.currency,
    minimumFractionDigits: value.decimals,
    maximumFractionDigits: value.decimals,
  }).format(value.amountMinor / 10 ** value.decimals);
}
export function flightTime(iso: string, timeZone: string, locale: Locale = 'en'): string {
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone,
  }).format(new Date(iso));
}
export function calendarDate(value: string, locale: Locale = 'en'): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T12:00:00Z`));
}
export function duration(minutes: number, locale: Locale = 'en'): string {
  const hours = Math.floor(minutes / 60),
    rest = minutes % 60;
  return locale === 'ar' ? `${hours} \u0633 ${rest} \u062f` : `${hours}h ${rest}m`;
}
export function localDepartureHour(iso: string, timeZone: string): number {
  return Number(
    new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hourCycle: 'h23', timeZone }).format(
      new Date(iso),
    ),
  );
}
export function arrivalDayDifference(
  departure: string,
  arrival: string,
  originZone: string,
  destinationZone: string,
): number {
  const day = (iso: string, timeZone: string) => {
    const parts = new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone,
    }).formatToParts(new Date(iso));
    const get = (kind: string) => parts.find((p) => p.type === kind)?.value ?? '';
    return Date.parse(`${get('year')}-${get('month')}-${get('day')}T12:00:00Z`);
  };
  return Math.round((day(arrival, destinationZone) - day(departure, originZone)) / 86400000);
}
