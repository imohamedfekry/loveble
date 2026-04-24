import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  CreateUserDto,
  LoginDto,
  TempUserDto,
  verfyOtpDto,
} from './dto/auth.dto';

import type { FastifyReply } from 'fastify';

@Controller('auth')
export class AuthController {
  constructor(private readonly AuthService: AuthService) { }

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
    @Req() req: any,
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
}