import { apiConfig } from './config.ts';
/** Called from Astro frontmatter; only public, allowlisted values are serialized. */
export const publicApiConfig = apiConfig({
  PUBLIC_API_BASE_URL: import.meta.env.PUBLIC_API_BASE_URL,
  PUBLIC_API_AIRPORTS_PATH: import.meta.env.PUBLIC_API_AIRPORTS_PATH,
  PUBLIC_API_SEARCH_PATH: import.meta.env.PUBLIC_API_SEARCH_PATH,
  PUBLIC_API_OFFER_PATH: import.meta.env.PUBLIC_API_OFFER_PATH,
  PUBLIC_API_SEARCH_METHOD: import.meta.env.PUBLIC_API_SEARCH_METHOD,
  PUBLIC_API_CREDENTIALS: import.meta.env.PUBLIC_API_CREDENTIALS,
  PUBLIC_DEFAULT_CURRENCY: import.meta.env.PUBLIC_DEFAULT_CURRENCY,
});
