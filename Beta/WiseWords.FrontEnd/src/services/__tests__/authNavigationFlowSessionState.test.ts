import { describe, it, expect, beforeEach } from 'vitest';
import { authNavigationFlowSessionState } from '../authNavigationFlowSessionState';

// Mock sessionStorage (same pattern as conversationCache tests)
const sessionStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
});

beforeEach(() => {
  sessionStorage.clear();
});

describe('authNavigationFlowSessionState', () => {
  it('sets and consumes loginReturnUrl', () => {
    const url = 'https://example.com/after-login';
    authNavigationFlowSessionState.setLoginReturnUrl(url);
    const consumed = authNavigationFlowSessionState.consumeLoginReturnUrl();
    expect(consumed).toBe(url);
    // Should be removed after consumption
    expect(sessionStorage.getItem('loginReturnUrl')).toBeNull();
  });

  it('sets and consumes logoutReturnUrl', () => {
    const url = 'https://example.com/after-logout';
    authNavigationFlowSessionState.setLogoutReturnUrl(url);
    const consumed = authNavigationFlowSessionState.consumeLogoutReturnUrl();
    expect(consumed).toBe(url);
    // Should be removed after consumption
    expect(sessionStorage.getItem('logoutReturnUrl')).toBeNull();
  });

  it('enforces mutual exclusion when setting loginReturnUrl', () => {
    // Pre-set logoutReturnUrl
    authNavigationFlowSessionState.setLogoutReturnUrl('https://example.com/logout-only');
    // Now set loginReturnUrl - should remove logoutReturnUrl
    const loginUrl = 'https://example.com/login-only';
    authNavigationFlowSessionState.setLoginReturnUrl(loginUrl);
    expect(sessionStorage.getItem('logoutReturnUrl')).toBeNull();
    expect(sessionStorage.getItem('loginReturnUrl')).toBe(loginUrl);
  });

  it('enforces mutual exclusion when setting logoutReturnUrl', () => {
    // Pre-set loginReturnUrl
    authNavigationFlowSessionState.setLoginReturnUrl('https://example.com/login-only');
    // Now set logoutReturnUrl - should remove loginReturnUrl
    const logoutUrl = 'https://example.com/logout-only';
    authNavigationFlowSessionState.setLogoutReturnUrl(logoutUrl);
    expect(sessionStorage.getItem('loginReturnUrl')).toBeNull();
    expect(sessionStorage.getItem('logoutReturnUrl')).toBe(logoutUrl);
  });

  it('marks and consumes loginInitiated', () => {
    authNavigationFlowSessionState.markLoginInitiated();
    expect(authNavigationFlowSessionState.consumeLoginInitiated()).toBe(true);
    // Value should be consumed
    expect(authNavigationFlowSessionState.consumeLoginInitiated()).toBe(false);
  });

  it('sets and gets previousAuthTokenCode', () => {
    const code = 'AUTH_CODE_123';
    authNavigationFlowSessionState.setPreviousAuthTokenCode(code);
    expect(authNavigationFlowSessionState.getPreviousAuthTokenCode()).toBe(code);
  });

  it('clearEphemeral clears all auth navigation keys', () => {
    // Set values via service (note: mutual exclusion applies between login/logout urls)
    authNavigationFlowSessionState.setLoginReturnUrl('https://example.com/login');
    authNavigationFlowSessionState.setLogoutReturnUrl('https://example.com/logout'); // clears loginReturnUrl
    authNavigationFlowSessionState.markLoginInitiated();
    authNavigationFlowSessionState.setPreviousAuthTokenCode('CODE');

    // Sanity checks before clear
    expect(sessionStorage.getItem('loginReturnUrl')).toBeNull(); // removed by setting logout
    expect(sessionStorage.getItem('logoutReturnUrl')).toBe('https://example.com/logout');
    expect(sessionStorage.getItem('loginInitiated')).toBe('true');
    expect(sessionStorage.getItem('previousAuthTokenCode')).toBe('CODE');

    // Clear
    authNavigationFlowSessionState.clearEphemeral();

    // All should be cleared
    expect(sessionStorage.getItem('loginReturnUrl')).toBeNull();
    expect(sessionStorage.getItem('logoutReturnUrl')).toBeNull();
    expect(sessionStorage.getItem('loginInitiated')).toBeNull();
    expect(sessionStorage.getItem('previousAuthTokenCode')).toBeNull();

    // Service getters should reflect cleared state
    expect(authNavigationFlowSessionState.consumeLoginReturnUrl()).toBeNull();
    expect(authNavigationFlowSessionState.consumeLogoutReturnUrl()).toBeNull();
    expect(authNavigationFlowSessionState.consumeLoginInitiated()).toBe(false);
    expect(authNavigationFlowSessionState.getPreviousAuthTokenCode()).toBeNull();
  });
});
