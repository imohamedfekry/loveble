"use client";

import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";

export function OTPInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  return (
    <InputOTP maxLength={7} value={value} onChange={onChange} pattern="\d*">
      {/* 3 شمال */}
      <InputOTPGroup>
        <InputOTPSlot index={0} />
        <InputOTPSlot index={1} />
        <InputOTPSlot index={2} />
      </InputOTPGroup>

      <InputOTPSeparator />
      <InputOTPGroup>

      <InputOTPSlot index={3} />
      </InputOTPGroup>

      <InputOTPSeparator />

      {/* 3 يمين */}
      <InputOTPGroup>
        <InputOTPSlot index={4} />
        <InputOTPSlot index={5} />
        <InputOTPSlot index={6} />
      </InputOTPGroup>
    </InputOTP>
  );
}
