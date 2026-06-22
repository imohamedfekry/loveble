import { Body, Controller, Get, Post, Query, Req, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  CreateUserDto,
  GithubCallbackDto,
  LoginDto,
  TempUserDto,
  verfyOtpDto,
} from './dto/auth.dto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { Auth } from 'src/common/decorator/auth-user.decorator';
import type { AuthenticatedRequest } from 'src/common/Global/security/types/auth-request.type';

@Controller('auth')
export class AuthController {
  constructor(private readonly AuthService: AuthService) {}

  @Post('request-otp')
  async requestOtp(@Body() body: TempUserDto) {
    return this.AuthService.requestOtp(body);
  }

  @Post('verify-otp')
  async verifyOtp(
    @Body() body: verfyOtpDto,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    return this.AuthService.verifyOtp(res, body);
  }

  @Post('create')
  async create(
    @Req() req: FastifyRequest,
    @Body() body: CreateUserDto,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    return this.AuthService.create(body, req, res);
  }

  @Post('login')
  async login(
    @Req() req: any,
    @Body() body: LoginDto,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    return this.AuthService.login(body, res);
  }

  @Get('github/connect')
  @Auth()
  async githubConnect(
    @Req() req: AuthenticatedRequest,
    @Res() res: FastifyReply,
  ) {
    return this.AuthService.getAuthUrl(req, res);
  }

  @Get('github/callback')
  @Auth()
  async githubCallback(
    @Query() query: GithubCallbackDto,
    @Res({ passthrough: true }) res: FastifyReply,
    @Req() req: AuthenticatedRequest,
  ) {
    const { code, state } = query;

    const accessToken = await this.AuthService.exchangeCode(code);
    const profile = await this.AuthService.getProfile(accessToken);

    return this.AuthService.linkAccount(profile, res, req, state);
  }
}
