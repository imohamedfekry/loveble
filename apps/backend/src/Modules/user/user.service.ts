import { Injectable } from '@nestjs/common';
import { CreateUserDto, TempUserDto } from './dto/user.dto';
import { TempUserRepository } from 'src/common/database/repositories/user/tempUser.repository';
import { UserRepository } from 'src/common/database/repositories/user/user.repository';
import { generateOtp } from 'src/common/Global/security/otp.helper';
import { hashHandler, verifyHash } from 'src/common/Global/security';
import { log } from 'console';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly tempUserRepository: TempUserRepository,
  ) {}
  async requestOtp(body: TempUserDto) {
    console.log(body);
    const tempUser = await this.tempUserRepository.findByEmail(body.email);
    if (tempUser) {
      // Handle existing temp user (e.g., resend OTP)
      return { message: 'OTP resent to your email' };
    }
    const existingUser = await this.userRepository.findByEmail(body.email);
    if (existingUser) {
      return { message: 'Email already exists' };
    }
    const otp = generateOtp({ length: 7 });
    const hashedOtp = await hashHandler(otp);
    await this.tempUserRepository.create({
      email: body.email,
      otpHash: hashedOtp,
      otpExpiry: new Date(Date.now() + 5 * 60 * 1000), // OTP expires in 5 minutes
    })
    return { message: 'OTP sent to your email', otp, hashedOtp };
  }
  async verifyOtp(email: string, otp: string) {
    const tempUser = await this.tempUserRepository.findByEmail(email);
    if (!tempUser) {
      return { message: 'Invalid email or OTP' };
    }
    if (tempUser.otpExpiry < new Date()) {
      return { message: 'OTP has expired' };
    }
    const isOtpValid = await verifyHash(otp, tempUser.otpHash);
    if (!isOtpValid) {
      return { message: 'Invalid email or OTP' };
    }
    return { message: 'OTP verified successfully' };
  }
  async getMe() {
    return 'This is the user profile';
  }
  async create(body: CreateUserDto) {
    return body;
  }
}
