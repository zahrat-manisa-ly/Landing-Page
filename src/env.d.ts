/// <reference types="astro/client" />
interface ImportMetaEnv {
  readonly PUBLIC_API_BASE_URL?: string;
  readonly PUBLIC_API_AIRPORTS_PATH?: string;
  readonly PUBLIC_API_SEARCH_PATH?: string;
  readonly PUBLIC_API_OFFER_PATH?: string;
  readonly PUBLIC_API_SEARCH_METHOD?: string;
  readonly PUBLIC_API_CREDENTIALS?: string;
  readonly PUBLIC_DEFAULT_CURRENCY?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
