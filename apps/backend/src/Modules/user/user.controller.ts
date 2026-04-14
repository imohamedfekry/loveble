import { Body, Controller, Get, Post } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto, TempUserDto, verfyOtpDto } from './dto/user.dto';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}
  @Post('request-otp')
  async requestOtp(@Body() body: TempUserDto) {
    return this.userService.requestOtp(body);
  }
  @Post('verify-otp')
  async verifyOtp(@Body() body: verfyOtpDto){
    return this.userService.verifyOtp(body.email, body.otp);
  }
  @Get('@me')
  async getMe() {
    return this.userService.getMe();
  }

  @Post('create')
  async create(@Body() body: CreateUserDto) {
    return this.userService.create(body);
  }
}
