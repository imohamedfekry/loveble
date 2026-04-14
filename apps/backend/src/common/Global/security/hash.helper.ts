import * as argon2 from 'argon2';

export async function hashHandler(password: string) {
  const pepper = process.env.PEPPER ?? '';
  return await argon2.hash(password + pepper);
}
export async function verifyHash(password: string, hash: string) {
  const pepper = process.env.PEPPER ?? '';
  return await argon2.verify(hash, password + pepper);
}
