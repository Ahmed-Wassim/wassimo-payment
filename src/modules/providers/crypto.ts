import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const PAYLOAD_VERSION = 'v1';

export function encryptPayload(plain: string, keyHex: string): string {
  const key = Buffer.from(keyHex, 'hex');
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const data = Buffer.concat([cipher.update(plain, 'utf-8'), cipher.final()]);

  return [
    PAYLOAD_VERSION,
    iv.toString('base64'),
    cipher.getAuthTag().toString('base64'),
    data.toString('base64'),
  ].join(':');
}

export function decryptPayload(payload: string, keyHex: string): string {
  const [version, ivB64, tagB64, dataB64] = payload.split(':');
  if (version !== PAYLOAD_VERSION) {
    throw new Error('Unsupported credential payload version');
  }
  const decipher = createDecipheriv(
    ALGORITHM,
    keyHex.length ? Buffer.from(keyHex, 'hex') : Buffer.alloc(0),
    Buffer.from(ivB64, 'base64'),
  );
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}
