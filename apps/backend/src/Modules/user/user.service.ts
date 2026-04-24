import { Injectable } from '@nestjs/common';
import { TempUserRepository } from 'src/common/database/repositories/user/tempUser.repository';
import { UserRepository } from 'src/common/database/repositories/user/user.repository';
import type { AuthenticatedUser } from 'src/common/Global/security/types/auth-request.type';
import { success } from 'src/common/utils/response.util';
import { RESPONSE_MESSAGES } from 'src/common/utils/response-messages';
import * as v from 'valibot';
import { UserProfileSchema } from './dto/user.dto';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly tempUserRepository: TempUserRepository,
  ) { }
  async getMe(user: AuthenticatedUser) {
    const safeUser = v.parse(UserProfileSchema, user);
    return success(RESPONSE_MESSAGES.USER.FETCH_SUCCESS, { user: safeUser });
  }
}
