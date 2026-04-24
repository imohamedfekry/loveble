export type OtpOptions = {
  length?: number;
  type?: 'numeric' | 'alphanumeric';
};

export function generateOtp(options?: OtpOptions): string {
  const length = options?.length ?? 6;
  const type = options?.type ?? 'numeric';

  const digits = '0123456789';
  const alpha =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  const chars = type === 'numeric' ? digits : alpha;

  let otp = '';

  for (let i = 0; i < length; i++) {
    const index = Math.floor(Math.random() * chars.length);
    otp += chars[index];
  }
  console.log(otp);
  
  return otp;
}
