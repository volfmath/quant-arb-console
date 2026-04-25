import { afterEach, describe, expect, it } from 'vitest';
import {
  decryptCredentialBundle,
  encryptCredentialBundle,
  maskCredential,
} from '../src/security/credential-vault';

afterEach(() => {
  delete process.env.CREDENTIAL_ENCRYPTION_KEY;
});

describe('credential vault', () => {
  it('encrypts and decrypts exchange credential bundles', () => {
    process.env.CREDENTIAL_ENCRYPTION_KEY = 'test-credential-key';

    const encrypted = encryptCredentialBundle({
      api_key: 'binance-api-key',
      api_secret: 'binance-api-secret',
      passphrase: 'passphrase',
    });

    expect(encrypted?.ciphertext).not.toContain('binance-api-secret');
    expect(decryptCredentialBundle(encrypted!)).toEqual({
      api_key: 'binance-api-key',
      api_secret: 'binance-api-secret',
      passphrase: 'passphrase',
    });
  });

  it('skips empty credentials and masks public identifiers', () => {
    expect(encryptCredentialBundle({ api_key: ' ', api_secret: '' })).toBeUndefined();
    expect(maskCredential('abcd1234wxyz')).toBe('abcd****wxyz');
    expect(maskCredential('abcd')).toBe('ab****cd');
  });
});
