import { applyDecorators, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../Global/security/guards/auth.guards';

export function Auth() {
    return applyDecorators(UseGuards(AuthGuard));
}
