import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { UserService } from './user.service';
import {
  CreateUserDto,
  LoginDto,
  TempUserDto,
  verfyOtpDto,
} from './dto/user.dto';

import type { AuthenticatedRequest } from 'src/common/Global/security/types/auth-request.type';
import type { FastifyReply } from 'fastify';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) { }

  @Post('request-otp')
  async requestOtp(@Body() body: TempUserDto) {
    return this.userService.requestOtp(body);
  }

  @Post('verify-otp')
  async verifyOtp(
    @Body() body: verfyOtpDto,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    return this.userService.verifyOtp(res, body);
  }

  @Get('@me')
  async getMe(@Req() req: AuthenticatedRequest) {
    return this.userService.getMe(req.user);
  }

  @Post('create')
  async create(
    @Req() req: any,
    @Body() body: CreateUserDto,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    return this.userService.create(body, req, res);
  }

  @Post('login')
  async login(
    @Req() req: any,
    @Body() body: LoginDto,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    return this.userService.login(body, res);
  }
}