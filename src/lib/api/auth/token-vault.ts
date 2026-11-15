export interface AccessTokenVault {
  get(): string | null;
  set(token: string): void;
  clear(): void;
  subscribe(listener: () => void): () => void;
}

export function createAccessTokenVault(): AccessTokenVault {
  let accessToken: string | null = null;
  const listeners = new Set<() => void>();

  function notify(): void {
    for (const listener of listeners) listener();
  }

  return {
    get: () => accessToken,
    set(token) {
      if (!token || token.length > 32768) throw new TypeError('Invalid access token');
      accessToken = token;
      notify();
    },
    clear() {
      if (accessToken === null) return;
      accessToken = null;
      notify();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export const accessTokenVault = createAccessTokenVault();
