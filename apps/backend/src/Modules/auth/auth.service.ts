import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import {
  CreateUserDto,
  LoginDto,
  TempUserDto,
  verfyOtpDto,
} from './dto/auth.dto';
import { generateOtp } from 'src/common/Global/security/otp.helper';
import { encrypt, hashHandler, verifyHash } from 'src/common/Global/security';
import { success, fail } from 'src/common/utils/response.util';
import { RESPONSE_MESSAGES } from 'src/common/utils/response-messages';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { AccessTokenService } from 'src/common/Global/security/jwt/services/access-token.service';
import { RefreshTokenService } from 'src/common/Global/security/jwt/services/refresh-token.service';
import { TempTokenService } from 'src/common/Global/security/jwt/services/temp-token.service';
import {
  OAuthRepository,
  TempUserRepository,
  UserRepository,
} from 'src/common/database/repositories';
import { ConfigService } from '@nestjs/config';
import type { AuthenticatedRequest } from 'src/common/Global/security/types/auth-request.type';
import { OauthTokenService } from 'src/common/Global/security/jwt/services/oauth-token.service';

interface GitHubProfile {
  provider: string;
  providerId: string;
  avatar_url: string;
  accessToken: string;
  email: string | null;
  username: string | null;
  displayName: string | null;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly tempUserRepository: TempUserRepository,
    private readonly accessService: AccessTokenService,
    private readonly refreshService: RefreshTokenService,
    private readonly tempTokenService: TempTokenService,
    private readonly oauthRepository: OAuthRepository,
    private readonly configService: ConfigService,
    private readonly oauthTokenService: OauthTokenService,
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
        const remainingTime = Math.ceil(
          (tempUser.otpExpiry.getTime() - now.getTime()) / 1000,
        );
        throw new BadRequestException(
          fail({
            code: RESPONSE_MESSAGES.AUTH.OTP.REQUEST.already_sent.code,
            message:
              RESPONSE_MESSAGES.AUTH.OTP.REQUEST.already_sent.message(
                remainingTime,
              ),
          }),
        );
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
    return success(RESPONSE_MESSAGES.AUTH.OTP.REQUEST.SUCCESS, {
      otp,
      hashedOtp,
    });
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
      purpose: 'create-user',
    });

    res.setCookie('temptoken', temptoken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
      maxAge: 3 * 60,
    });

    return success(RESPONSE_MESSAGES.AUTH.OTP.VERFIED);
  }

  async create(body: CreateUserDto, req: FastifyRequest, res: FastifyReply) {
    const request = req as FastifyRequest;
    const token = request.cookies?.['temptoken'];

    if (!token) {
      throw new UnauthorizedException(
        fail(RESPONSE_MESSAGES.USER.CREATE.FAIL.INVALID_TOKEN),
      );
    }

    try {
      const decoded = await this.tempTokenService.verify<{ sub: string }>(
        token,
      );

      const tempUser = await this.tempUserRepository.findById(
        BigInt(decoded.sub),
      );
      if (!tempUser)
        throw new UnauthorizedException(
          fail(RESPONSE_MESSAGES.USER.CREATE.FAIL.INVALID_TOKEN),
        );

      const existingUser = await this.userRepository.findByEmail(
        tempUser.email,
      );
      if (existingUser)
        throw new BadRequestException(
          fail(RESPONSE_MESSAGES.USER.CREATE.FAIL.USER_ALREADY_EXISTS),
        );

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
      throw new UnauthorizedException(
        fail(RESPONSE_MESSAGES.USER.CREATE.FAIL.INVALID_TOKEN),
      );
    }
  }

  async login(body: LoginDto, res: FastifyReply) {
    const user = await this.userRepository.findByEmail(body.email);
    if (!user || !(await verifyHash(body.password, user.password))) {
      throw new UnauthorizedException(
        fail(RESPONSE_MESSAGES.AUTH.login.FAIL.INVALID_CREDENTIALS),
      );
    }

    this.issueTokens(res, user.id.toString());
    return success(RESPONSE_MESSAGES.AUTH.login.SUCCESS);
  }
  // // // // // // // // // // GITHUB OAUTH // // // // // // // // // // //
  getAuthUrl(req: AuthenticatedRequest, res: FastifyReply) {
    const clientId = this.configService.get<string>('GITHUB_CLIENT_ID')!;
    const state = this.oauthTokenService.sign({ sub: req.user.id.toString() });
    const callbackURL = 'http://localhost:3000/callback';
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: callbackURL,
      scope: 'user:email repo',
      state,
    });

    const url = `https://github.com/login/oauth/authorize?${params.toString()}`;
    return res.status(302).redirect(url);
  }
  async exchangeCode(code: string): Promise<string> {
    const response = await fetch(
      'https://github.com/login/oauth/access_token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          client_id: this.configService.get<string>('GITHUB_CLIENT_ID'),
          client_secret: this.configService.get<string>('GITHUB_CLIENT_SECRET'),
          code,
        }),
      },
    );

    const data = (await response.json()) as {
      access_token?: string;
      error?: string;
    };

    if (!data.access_token) {
      throw new UnauthorizedException(
        fail(RESPONSE_MESSAGES.AUTH.oauth.LINK.FAIL.INVALID_OAUTH_RESPONSE),
      );
    }

    return data.access_token;
  }
  async getProfile(accessToken: string): Promise<GitHubProfile> {
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    };

    const [userRes, emailsRes] = await Promise.all([
      fetch('https://api.github.com/user', { headers }),
      fetch('https://api.github.com/user/emails', { headers }),
    ]);

    const user = (await userRes.json()) as any;
    const emails = (await emailsRes.json()) as any[];
    console.log('User:', user);
    console.log('Emails:', emails);
    const primaryEmail =
      emails.find((e) => e.primary && e.verified)?.email ??
      emails[0]?.email ??
      null;

    return {
      provider: 'github',
      providerId: String(user.id),

      accessToken,
      email: primaryEmail,
      username: user.login ?? null,
      displayName: user.name ?? null,
      avatar_url: user.avatar_url ?? null,
    };
  }
  async linkAccount(
    profile: GitHubProfile,
    res: FastifyReply,
    req: AuthenticatedRequest,
    state?: string,
  ) {
    if (!profile.provider || !profile.providerId) {
      throw new BadRequestException(
        fail(RESPONSE_MESSAGES.AUTH.oauth.LINK.FAIL.INVALID_OAUTH_RESPONSE),
      );
    }
    console.log('state', state);
    console.log('profile', profile);
    // console.log(req.user.id);

    if (state) {
      const decoded = await this.oauthTokenService.verify<{ sub: string }>(
        state,
      );
      if (decoded.sub !== req.user.id.toString()) {
        throw new BadRequestException(
          fail(RESPONSE_MESSAGES.AUTH.oauth.LINK.FAIL.INVALID_OAUTH_RESPONSE),
        );
      }
    }
    const existingOAuth = await this.oauthRepository.findByProvider(
      profile.provider,
      profile.providerId,
    );

    // الـ OAuth account موجود → login مباشر
    if (existingOAuth) {
      const user = await this.userRepository.findById(existingOAuth.userId);
      if (!user) {
        throw new UnauthorizedException(
          fail(RESPONSE_MESSAGES.AUTH.UNAUTHORIZED),
        );
      }

      await this.oauthRepository.updateToken(
        profile.provider,
        profile.providerId,
        profile.accessToken,
      );

      this.issueTokens(res, user.id.toString());
      return success(RESPONSE_MESSAGES.AUTH.oauth.LINK.SUCCESS, {
        provider: profile.provider,
        linked: true,
      });
    }

    // مفيش email → مش قادر ننشئ account
    if (!profile.email) {
      throw new UnauthorizedException(
        fail(RESPONSE_MESSAGES.AUTH.oauth.LINK.FAIL.EMAIL_REQUIRED),
      );
    }
    // encryption accesstoken
    profile.accessToken = encrypt(profile.accessToken);
    await this.oauthRepository.create({
      userId: req.user.id,
      provider: profile.provider,
      avatar_url: profile.avatar_url,
      providerId: profile.providerId,
      accessToken: profile.accessToken,
      username: profile.username,
      displayName: profile.displayName,
    });

    this.issueTokens(res, req.user.id.toString());
    return success(RESPONSE_MESSAGES.AUTH.oauth.LINK.SUCCESS, {
      provider: profile.provider,
      linked: true,
    });
  }
  private issueTokens(res: FastifyReply, userId: string) {
    const accessToken = this.accessService.sign({
      sub: userId,
      type: 'access',
    });
    const refreshToken = this.refreshService.sign({
      sub: userId,
      type: 'refresh',
    });

    res.setCookie('Authorization', accessToken, {
      httpOnly: true,
      secure: true, // ← دايماً true مع SameSite=None
      sameSite: 'none',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    res.setCookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: true, // ← دايماً true مع SameSite=None
      sameSite: 'none',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });
  }
}
