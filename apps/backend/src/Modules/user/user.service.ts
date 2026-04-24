import { Injectable } from '@nestjs/common';
import { CreateUserDto, LoginDto, TempUserDto, verfyOtpDto } from './dto/user.dto';
import { TempUserRepository } from 'src/common/database/repositories/user/tempUser.repository';
import { UserRepository } from 'src/common/database/repositories/user/user.repository';
import { generateOtp } from 'src/common/Global/security/otp.helper';
import { hashHandler, verifyHash } from 'src/common/Global/security';
import type { AuthenticatedUser } from 'src/common/Global/security/types/auth-request.type';
import { success } from 'src/common/utils/response.util';
import { RESPONSE_MESSAGES } from 'src/common/utils/response-messages';
import { JwtHelper } from 'src/common/Global/security/jwt/jwt.helper';
import { fail } from 'src/common/utils/response.util';
import type { FastifyReply } from 'fastify';
@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly tempUserRepository: TempUserRepository,
    private readonly jwtHelper: JwtHelper,
  ) { }
  async requestOtp(body: TempUserDto) {
    const tempUser = await this.tempUserRepository.findByEmail(body.email);
    if (tempUser) {
      const now = new Date();

      if (tempUser.otpExpiry <= now) {
        // OTP expired → regenerate

        const otp = generateOtp({ length: 7 });
        console.log(otp);

        const hashedOtp = await hashHandler(otp);

        await this.tempUserRepository.updateOtpByEmail(body.email, {
          otpHash: hashedOtp,
          otpExpiry: new Date(Date.now() + 2 * 60 * 1000),
        });
        return success(RESPONSE_MESSAGES.AUTH.OTP.REQUEST.RESENT);
      } else {
        const remainingTime = Math.ceil(
          (tempUser.otpExpiry.getTime() - now.getTime()) / 1000,
        );
        return fail({
          code: RESPONSE_MESSAGES.AUTH.OTP.REQUEST.already_sent.code,
          message: RESPONSE_MESSAGES.AUTH.OTP.REQUEST.already_sent.message(remainingTime),
        });
      }

    }
    const existingUser = await this.userRepository.findByEmail(body.email);
    if (existingUser) {
      return success(RESPONSE_MESSAGES.AUTH.OTP.REQUEST.EMAIL_ALREADY_EXISTS);
    }
    const otp = generateOtp({ length: 7 });
    console.log(otp);

    const hashedOtp = await hashHandler(otp);
    await this.tempUserRepository.create({
      email: body.email,
      otpHash: hashedOtp,
      otpExpiry: new Date(Date.now() + 2 * 60 * 1000), // OTP expires in 2 minutes
    });
    return success(RESPONSE_MESSAGES.AUTH.OTP.REQUEST.SUCCESS, {
      otp,
      hashedOtp,
    });
  }
  async verifyOtp(res: FastifyReply, body: verfyOtpDto) {
    const tempUser = await this.tempUserRepository.findByEmail(body.email);
    if (!tempUser) {
      return success(RESPONSE_MESSAGES.AUTH.OTP.INVALID);
    }
    if (tempUser.otpExpiry < new Date()) {
      return success(RESPONSE_MESSAGES.AUTH.OTP.EXPIRED);
    }
    const isOtpValid = await verifyHash(body.otp, tempUser.otpHash);
    if (!isOtpValid) {
      return success(RESPONSE_MESSAGES.AUTH.OTP.INVALID);
    }

    const temptoken = this.jwtHelper.token('sign', 'temp', {
      sub: tempUser.id.toString(),
      purpose: 'create-user',
    });
    res.setCookie('temptoken', temptoken as string, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 2 * 60, // 2 minutes in seconds
    });
    return success(RESPONSE_MESSAGES.AUTH.OTP.VERFIED);
  }
  async create(body: CreateUserDto, req: any, res: FastifyReply) {
    console.log(body);

    const token = req.cookies.temptoken;
    if (!token) {
      return fail(RESPONSE_MESSAGES.USER.CREATE.FAIL.INVALID_TOKEN);
    }
    const decoded = this.jwtHelper.token('verify', 'temp', token) as {
      sub?: string;
    } | null;
    if (!decoded?.sub) {
      return fail(RESPONSE_MESSAGES.USER.CREATE.FAIL.INVALID_TOKEN);
    }

    const tempUserId = BigInt(decoded.sub);
    const tempUser = await this.tempUserRepository.findById(tempUserId);
    if (!tempUser) {
      return fail(RESPONSE_MESSAGES.USER.CREATE.FAIL.INVALID_TOKEN);
    }

    const existingUser = await this.userRepository.findByEmail(tempUser.email);
    if (existingUser) {
      return fail(RESPONSE_MESSAGES.USER.CREATE.FAIL.USER_ALREADY_EXISTS);
    }

    const hashedPassword = await hashHandler(body.password);
    const user = await this.userRepository.create({
      username: body.name,
      email: tempUser.email,
      password: hashedPassword,
    });
    await this.tempUserRepository.deleteById(tempUser.id);
    // create acsess + refresh token
    const accessToken = this.jwtHelper.token('sign', 'access', {
      sub: user.id.toString(),
      type: 'access',
    });
    const refreshToken = this.jwtHelper.token('sign', 'refresh', {
      sub: user.id.toString(),
      type: 'refresh',
    });
    // remove temptoken from cookie
    res.clearCookie('temptoken');
    res.setCookie('Authorization', accessToken as string, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
    });
    res.setCookie('refreshToken', refreshToken as string, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
    });
    return success(RESPONSE_MESSAGES.USER.CREATE.SUCCESS);
  }
  async login(body: LoginDto, res: FastifyReply) {
    console.log(body);
    const user = await this.userRepository.findByEmail(body.email);
    if (!user) {
      return fail(RESPONSE_MESSAGES.AUTH.login.FAIL.INVALID_CREDENTIALS);
    }
    const isPasswordValid = await verifyHash(body.password, user.password);
    if (!isPasswordValid) {
      return fail(RESPONSE_MESSAGES.AUTH.login.FAIL.INVALID_CREDENTIALS);
    }
    const accessToken = this.jwtHelper.token('sign', 'access', {
      sub: user.id.toString(),
      type: 'access',
    });
    const refreshToken = this.jwtHelper.token('sign', 'refresh', {
      sub: user.id.toString(),
      type: 'refresh',
    });
    res.setCookie('Authorization', accessToken as string, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
    });
    res.setCookie('refreshToken', refreshToken as string, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
    });
    return success(RESPONSE_MESSAGES.AUTH.login.SUCCESS);
  }
  async getMe(user: AuthenticatedUser) {
    return success(RESPONSE_MESSAGES.USER.FETCH_SUCCESS, { user });
  }
}
