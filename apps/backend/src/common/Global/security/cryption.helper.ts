import crypto from 'crypto';

const ALGORITHM = process.env.ENCRYPTION_ALGORITHM ?? '';
const KEY = Buffer.from(process.env.ENCRYPTION_KEY ?? '');
const IV = Buffer.from(process.env.ENCRYPTION_IV ?? '');
export function encrypt(text: string): string {
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, IV);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}
export function decrypt(encrypted: string): string {
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, IV);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
