import type { APIRoute } from 'astro';
// Preview is intentionally not indexable. Change only after release approval.
export const prerender = true;
export const GET: APIRoute = () =>
  new Response('User-agent: *\nDisallow: /\n', {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
