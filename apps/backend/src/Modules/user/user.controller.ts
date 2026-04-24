import { Controller, Get, Req } from '@nestjs/common';
import { UserService } from './user.service';
import type { AuthenticatedRequest } from 'src/common/Global/security/types/auth-request.type';
import { Auth } from 'src/common/decorator/auth-user.decorator';

@Controller('user')
@Auth()
export class UserController {
  constructor(private readonly userService: UserService) { }
  @Get('@me')
  async getMe(@Req() req: AuthenticatedRequest) {
    return this.userService.getMe(req.user);
  }
}