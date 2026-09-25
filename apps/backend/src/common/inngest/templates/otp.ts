export function OtpTemplate(data: Record<string, string>): string {
  const otp = data.otp;
  return `
    <html>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1a1a1b;">Your OTP Code</h1>
        <p style="color: #666; font-size: 16px;">Use the code below to verify your identity:</p>
        <div style="background: #f4f4f5; border-radius: 8px; padding: 24px; text-align: center; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #1a1a1b;">${otp}</span>
        </div>
        <p style="color: #999; font-size: 12px;">This code expires in 2 minutes.</p>
      </body>
    </html>
  `;
}
