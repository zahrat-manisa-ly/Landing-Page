import { route } from '../../i18n/index.ts';
import type { Locale } from '../../lib/domain/types.ts';

const RETURN_PATH = /^\/(en|ar)\/(?:$|flights\/(?:$|results\/$|offer\/$))/;

export function safeAuthReturnPath(locale: Locale, value: string | null): string {
  const fallback = route(locale, 'flights');
  if (!value || value.startsWith('//') || value.includes('\\')) return fallback;
  try {
    const parsed = new URL(value, 'https://frontend.invalid');
    if (parsed.origin !== 'https://frontend.invalid' || !RETURN_PATH.test(parsed.pathname))
      return fallback;
    if (!parsed.pathname.startsWith(`/${locale}/`)) return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
