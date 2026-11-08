// Unit tests for frontend/src/config/api.ts
// Run: node --test frontend/src/config/api.test.mjs
// (Plain Node; the config module is dependency-free and uses only
// erasable TypeScript, so Node's type stripping can import it directly.
// No emulator, Expo, or Play Billing is needed.)
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  resolveApiUrl,
  isBackendConfigured,
  requireApiUrl,
  NO_API_URL_MESSAGE,
  PLAY_BILLING_ONLY_NOTE,
} from './api.ts';

describe('resolveApiUrl', () => {
  it('prefers extra.apiUrl over the env var', () => {
    assert.equal(resolveApiUrl('https://api.example.test', 'https://env.example.test'), 'https://api.example.test');
  });

  it('falls back to the env var when extra is empty', () => {
    assert.equal(resolveApiUrl('', 'https://env.example.test'), 'https://env.example.test');
  });

  it('returns "" when neither is set (Play-Billing-only)', () => {
    assert.equal(resolveApiUrl('', ''), '');
    assert.equal(resolveApiUrl(null, undefined), '');
    assert.equal(resolveApiUrl(undefined, undefined), '');
  });

  it('trims whitespace', () => {
    assert.equal(resolveApiUrl('  https://api.example.test  ', ''), 'https://api.example.test');
    assert.equal(resolveApiUrl('   ', ''), '');
  });
});

describe('isBackendConfigured', () => {
  it('is false for the production empty-string config', () => {
    assert.equal(isBackendConfigured('', ''), false);
  });

  it('is true when either source has a URL', () => {
    assert.equal(isBackendConfigured('', 'http://localhost:8000'), true);
    assert.equal(isBackendConfigured('https://api.example.test', ''), true);
  });
});

describe('requireApiUrl — fail loudly instead of silently empty', () => {
  it('returns the URL when one is configured', () => {
    assert.equal(requireApiUrl('', 'http://localhost:8000'), 'http://localhost:8000');
  });

  it('throws a clear config error when no URL is configured', () => {
    assert.throws(
      () => requireApiUrl('', ''),
      (err) => {
        assert.ok(err instanceof Error);
        assert.match(err.message, /No backend API URL is configured/);
        assert.match(err.message, /EXPO_PUBLIC_API_BASE_URL/);
        assert.match(err.message, /Play-Billing-only/);
        return true;
      },
    );
  });

  it('throws for null/undefined inputs too', () => {
    assert.throws(() => requireApiUrl(null, undefined), /No backend API URL is configured/);
  });
});

describe('messages', () => {
  it('names the Play-Billing-only path and never invents a URL', () => {
    assert.match(PLAY_BILLING_ONLY_NOTE, /Play Billing/);
    assert.match(NO_API_URL_MESSAGE, /Play-Billing-only/);
    // No placeholder or guessed production URL may creep into the message.
    assert.doesNotMatch(NO_API_URL_MESSAGE, /example\.com/);
    assert.doesNotMatch(NO_API_URL_MESSAGE, /api\.estimate/);
  });
});
