import { en } from './en.ts';
import { ar } from './ar.ts';
import type { Locale } from '../lib/domain/types.ts';
export type TranslationKey = keyof typeof en;
export function t(locale: Locale, key: TranslationKey): string {
  return locale === 'ar' ? ar[key] : en[key];
}
export function translate(locale: Locale, key: string): string {
  return Object.hasOwn(en, key) ? t(locale, key as TranslationKey) : key;
}
export function route(locale: Locale, path = ''): string {
  return `/${locale}/${path.replace(/^\/+|\/+$/g, '')}${path ? '/' : ''}`;
}
export function languagePaths() {
  return (['en', 'ar'] as const).map((lang) => ({ params: { lang }, props: { locale: lang } }));
}
