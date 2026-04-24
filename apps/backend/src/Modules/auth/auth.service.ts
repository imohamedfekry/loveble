import { Injectable } from '@nestjs/common';
import { CreateUserDto, LoginDto, TempUserDto, verfyOtpDto } from './dto/auth.dto';
import { TempUserRepository } from 'src/common/database/repositories/user/tempUser.repository';
import { UserRepository } from 'src/common/database/repositories/user/user.repository';
import { generateOtp } from 'src/common/Global/security/otp.helper';
import { hashHandler, verifyHash } from 'src/common/Global/security';
import type { AuthenticatedUser } from 'src/common/Global/security/types/auth-request.type';
import { success, fail } from 'src/common/utils/response.util';
import { RESPONSE_MESSAGES } from 'src/common/utils/response-messages';
import type { FastifyReply } from 'fastify';

import { AccessTokenService } from 'src/common/Global/security/jwt/services/access-token.service';
import { RefreshTokenService } from 'src/common/Global/security/jwt/services/refresh-token.service';
import { TempTokenService } from 'src/common/Global/security/jwt/services/temp-token.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly tempUserRepository: TempUserRepository,
    private readonly accessService: AccessTokenService,
    private readonly refreshService: RefreshTokenService,
    private readonly tempTokenService: TempTokenService,
  ) { }

  async requestOtp(body: TempUserDto) {
    const tempUser = await this.tempUserRepository.findByEmail(body.email);
    if (tempUser) {
      const now = new Date();
      if (tempUser.otpExpiry <= now) {
        const otp = generateOtp({ length: 7 });
        const hashedOtp = await hashHandler(otp);
        await this.tempUserRepository.updateOtpByEmail(body.email, {
          otpHash: hashedOtp,
          otpExpiry: new Date(Date.now() + 2 * 60 * 1000),
        });
        return success(RESPONSE_MESSAGES.AUTH.OTP.REQUEST.RESENT);
      } else {
        const remainingTime = Math.ceil((tempUser.otpExpiry.getTime() - now.getTime()) / 1000);
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
    const hashedOtp = await hashHandler(otp);
    await this.tempUserRepository.create({
      email: body.email,
      otpHash: hashedOtp,
      otpExpiry: new Date(Date.now() + 2 * 60 * 1000),
    });
    return success(RESPONSE_MESSAGES.AUTH.OTP.REQUEST.SUCCESS, { otp, hashedOtp });
  }

  async verifyOtp(res: FastifyReply, body: verfyOtpDto) {
    const tempUser = await this.tempUserRepository.findByEmail(body.email);
    if (!tempUser || tempUser.otpExpiry < new Date()) {
      return success(RESPONSE_MESSAGES.AUTH.OTP.INVALID);
    }

    const isOtpValid = await verifyHash(body.otp, tempUser.otpHash);
    if (!isOtpValid) return success(RESPONSE_MESSAGES.AUTH.OTP.INVALID);

    const temptoken = this.tempTokenService.sign({ 
      sub: tempUser.id.toString(), 
      purpose: 'create-user' 
    });

    res.setCookie('temptoken', temptoken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 3 * 60,
    });

    return success(RESPONSE_MESSAGES.AUTH.OTP.VERFIED);
  }

  async create(body: CreateUserDto, req: any, res: FastifyReply) {
    const token = req.cookies.temptoken;
    if (!token) return fail(RESPONSE_MESSAGES.USER.CREATE.FAIL.INVALID_TOKEN);

    try {
      const decoded = await this.tempTokenService.verify<{ sub: string }>(token);

      const tempUser = await this.tempUserRepository.findById(BigInt(decoded.sub));
      if (!tempUser) return fail(RESPONSE_MESSAGES.USER.CREATE.FAIL.INVALID_TOKEN);

      const existingUser = await this.userRepository.findByEmail(tempUser.email);
      if (existingUser) return fail(RESPONSE_MESSAGES.USER.CREATE.FAIL.USER_ALREADY_EXISTS);

      const user = await this.userRepository.create({
        username: body.name,
        email: tempUser.email,
        password: await hashHandler(body.password),
      });

      await this.tempUserRepository.deleteById(tempUser.id);

      this.issueTokens(res, user.id.toString());
      res.clearCookie('temptoken', { path: '/' });

      return success(RESPONSE_MESSAGES.USER.CREATE.SUCCESS);
    } catch {
      return fail(RESPONSE_MESSAGES.USER.CREATE.FAIL.INVALID_TOKEN);
    }
  }

  async login(body: LoginDto, res: FastifyReply) {
    const user = await this.userRepository.findByEmail(body.email);
    if (!user || !(await verifyHash(body.password, user.password))) {
      return fail(RESPONSE_MESSAGES.AUTH.login.FAIL.INVALID_CREDENTIALS);
    }

    this.issueTokens(res, user.id.toString());
    return success(RESPONSE_MESSAGES.AUTH.login.SUCCESS);
  }

  private issueTokens(res: FastifyReply, userId: string) {
    const accessToken = this.accessService.sign({ sub: userId, type: 'access' });
    const refreshToken = this.refreshService.sign({ sub: userId, type: 'refresh' });

    res.setCookie('Authorization', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    res.setCookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });
  }

  async getMe(user: AuthenticatedUser) {
    return success(RESPONSE_MESSAGES.USER.FETCH_SUCCESS, { user });
  }
}
