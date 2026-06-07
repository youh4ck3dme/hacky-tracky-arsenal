import { beforeEach, describe, expect, it } from 'vitest';
import { clearToken, getToken, setToken } from '../../../frontend/src/lib/api';

describe('api token helpers', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('setToken and getToken round-trip', () => {
    setToken('my-secret-token');
    expect(getToken()).toBe('my-secret-token');
  });

  it('clearToken removes stored token', () => {
    setToken('my-secret-token');
    clearToken();
    expect(getToken()).toBeNull();
  });

  it('getToken returns null when unset', () => {
    expect(getToken()).toBeNull();
  });
});
