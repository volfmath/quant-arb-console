import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { getAppConfig } from '../config/app.config';

export type CredentialBundle = {
  api_key?: string;
  api_secret?: string;
  passphrase?: string;
};

export type EncryptedCredentialBundle = {
  iv: string;
  tag: string;
  ciphertext: string;
};

export function encryptCredentialBundle(bundle: CredentialBundle): EncryptedCredentialBundle | undefined {
  const normalized = normalizeBundle(bundle);
  if (!normalized) {
    return undefined;
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(normalized), 'utf8'), cipher.final()]);

  return {
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    ciphertext: ciphertext.toString('base64'),
  };
}

export function decryptCredentialBundle(encrypted: EncryptedCredentialBundle): CredentialBundle {
  const decipher = createDecipheriv('aes-256-gcm', getEncryptionKey(), Buffer.from(encrypted.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(encrypted.tag, 'base64'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(encrypted.ciphertext, 'base64')),
    decipher.final(),
  ]).toString('utf8');

  return JSON.parse(plaintext) as CredentialBundle;
}

export function maskCredential(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  if (value.length <= 8) {
    return `${value.slice(0, 2)}****${value.slice(-2)}`;
  }

  return `${value.slice(0, 4)}****${value.slice(-4)}`;
}

function normalizeBundle(bundle: CredentialBundle): CredentialBundle | undefined {
  const normalized = {
    api_key: clean(bundle.api_key),
    api_secret: clean(bundle.api_secret),
    passphrase: clean(bundle.passphrase),
  };

  return normalized.api_key || normalized.api_secret || normalized.passphrase ? normalized : undefined;
}

function clean(value: string | undefined): string | undefined {
  const cleaned = value?.trim();
  return cleaned ? cleaned : undefined;
}

function getEncryptionKey(): Buffer {
  const secret = process.env.CREDENTIAL_ENCRYPTION_KEY || getAppConfig().jwtSecret;
  return createHash('sha256').update(secret).digest();
}
