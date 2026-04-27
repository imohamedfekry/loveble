import { applyDecorators, UseGuards, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '../Global/security/guards/auth.guards';

export function Auth() {
    return applyDecorators(UseGuards(AuthGuard));
}

export const AuthUser = createParamDecorator(
    (data: unknown, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        return request.user;
    },
);
