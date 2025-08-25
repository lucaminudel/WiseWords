export type AuthNavKeys = {
  loginReturnUrl: string;
  logoutReturnUrl: string;
  previousAuthTokenCode: string;
  loginInitiated: string;
};

const KEYS: AuthNavKeys = {
  loginReturnUrl: 'loginReturnUrl',
  logoutReturnUrl: 'logoutReturnUrl',
  previousAuthTokenCode: 'previousAuthTokenCode',
  loginInitiated: 'loginInitiated',
};

function setItem(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value);
  } catch {}
}

function getItem(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function removeItem(key: string) {
  try {
    sessionStorage.removeItem(key);
  } catch {}
}

export const authNavigationFlowSessionState = {
  // Login flow management
  setLoginReturnUrl(url: string) {
    // enforce mutual exclusion with logout
    removeItem(KEYS.logoutReturnUrl);
    setItem(KEYS.loginReturnUrl, url);
  },
  consumeLoginReturnUrl(): string | null {
    const url = getItem(KEYS.loginReturnUrl);
    // Item not removed to implement idempotency for potential multiple re-mounts and redirects
    return url;
  },
  isLogIn(): boolean {
    return getItem(KEYS.loginReturnUrl) !== null;
  },

  // Logout flow management
  setLogoutReturnUrl(url: string) {
    // enforce mutual exclusion with login
    removeItem(KEYS.loginReturnUrl);
    setItem(KEYS.logoutReturnUrl, url);
  },
  consumeLogoutReturnUrl(): string | null {
    const url = getItem(KEYS.logoutReturnUrl);
    // Item not removed to implement idempotency for potential multiple re-mounts and redirects
    return url;
  },
  isLogOut(): boolean {
    return getItem(KEYS.logoutReturnUrl) !== null;
  },

  // UX signalling for post-login actions
  markLoginInitiated() {
    setItem(KEYS.loginInitiated, 'true');
  },
  consumeLoginInitiated(): boolean {
    const v = getItem(KEYS.loginInitiated);
    if (v !== null) removeItem(KEYS.loginInitiated);
    return v === 'true';
  },

  // Authorization code deduplication
  getPreviousAuthTokenCode(): string | null {
    return getItem(KEYS.previousAuthTokenCode);
  },
  setPreviousAuthTokenCode(code: string) {
    setItem(KEYS.previousAuthTokenCode, code);
  },

  // Cleanup helpers
  clearEphemeral() {
    [KEYS.previousAuthTokenCode, KEYS.loginReturnUrl, KEYS.logoutReturnUrl, KEYS.loginInitiated].forEach(removeItem);
  },

  KEYS,
};
