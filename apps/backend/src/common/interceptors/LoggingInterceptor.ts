import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<any> {
    const req = ctx.switchToHttp().getRequest();
    const { method, url } = req;
    const handler = `${ctx.getClass().name}.${ctx.getHandler().name}`;
    const start = Date.now();

    return next.handle().pipe(
      tap(() =>
        this.logger.log(`${method} ${url} -> ${handler} (${Date.now() - start}ms)`),
      ),
    );
  }
}