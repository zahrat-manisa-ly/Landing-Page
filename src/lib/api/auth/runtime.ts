import { createAuthApi } from './client.ts';
import { getQueryClient } from './query-client.ts';
import { createAuthContracts } from './queries.ts';

let browserRuntime: ReturnType<typeof createAuthContracts> | undefined;

function createRuntime(): ReturnType<typeof createAuthContracts> {
  return createAuthContracts(
    createAuthApi({ baseUrl: import.meta.env.PUBLIC_API_BASE_URL ?? '' }),
    getQueryClient(),
  );
}

export function getAuthContracts(): ReturnType<typeof createAuthContracts> {
  if (typeof window === 'undefined') return createRuntime();
  return (browserRuntime ??= createRuntime());
}
