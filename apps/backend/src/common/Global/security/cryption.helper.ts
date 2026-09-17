import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY
  ? Buffer.from(process.env.ENCRYPTION_KEY)
  : null;

// Legacy static-IV path — only used to decrypt values written before the
// per-operation-IV migration. New encryptions always derive a fresh IV.
const LEGACY_KEY = Buffer.from(process.env.ENCRYPTION_KEY ?? '');
const LEGACY_IV = Buffer.from(process.env.ENCRYPTION_IV ?? '');

// AES-256-CBC needs a 32-byte key and a 16-byte IV.
function normalizeKey(key: Buffer): Buffer {
  if (key.length >= 32) return key.subarray(0, 32);
  return Buffer.concat([key, Buffer.alloc(32 - key.length)]);
}

export function encrypt(text: string): string {
  const key =
    ENCRYPTION_KEY && ENCRYPTION_KEY.length > 0
      ? normalizeKey(ENCRYPTION_KEY)
      : normalizeKey(LEGACY_KEY);
  if (key.length === 0) {
    throw new Error('ENCRYPTION_KEY is not configured');
  }

  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([
    cipher.update(text, 'utf8'),
    cipher.final(),
  ]);

  // Format: iv(hex)<separator>ciphertext(hex)
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decrypt(encrypted: string): string {
  const key = normalizeKey(
    ENCRYPTION_KEY && ENCRYPTION_KEY.length > 0 ? ENCRYPTION_KEY : LEGACY_KEY,
  );

  const separator = encrypted.indexOf(':');
  if (separator !== -1) {
    const ivHex = encrypted.substring(0, separator);
    const dataHex = encrypted.substring(separator + 1);
    const iv = Buffer.from(ivHex, 'hex');
    const data = Buffer.from(dataHex, 'hex');
    if (iv.length === 16) {
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      return Buffer.concat([decipher.update(data), decipher.final()]).toString(
        'utf8',
      );
    }
  }

  // Legacy static-IV ciphertext (no IV prefix).
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, LEGACY_IV);
  return Buffer.concat([
    decipher.update(encrypted, 'hex'),
    decipher.final(),
  ]).toString('utf8');
}
