import { Injectable } from '@nestjs/common';
import { TempUserRepository } from '../../common/database/repositories/user/tempUser.repository';
import { UserRepository } from '../../common/database/repositories/user/user.repository';
import { success } from 'src/common/utils/response.util';
import { RESPONSE_MESSAGES } from 'src/common/utils/response-messages';
import * as v from 'valibot';
import { UserProfileSchema } from './dto/user.dto';
import { AuthenticatedRequest } from 'src/common/Global/security/types/auth-request.type';

@Injectable()
export class UserService {
  constructor(
    // private readonly userRepository: UserRepository,
    // private readonly tempUserRepository: TempUserRepository,
  ) { }
  async getMe(req: AuthenticatedRequest) {
    const safeUser = v.parse(UserProfileSchema, req.user);
    return success(RESPONSE_MESSAGES.USER.FETCH_SUCCESS, { user: safeUser });
  }
}
