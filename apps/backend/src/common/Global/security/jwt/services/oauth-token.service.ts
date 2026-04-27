import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OauthTokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) { }

  sign(payload: object) {
    return this.jwtService.sign(payload, {
      secret: this.configService.get('jwt.oauth.secret'),
      expiresIn: '2m',
    });
  }

  async verify<T extends object>(token: string): Promise<T> {
    const status = await this.jwtService.verifyAsync<T>(token, {
      secret: this.configService.get('jwt.oauth.secret'),
    });
    return status;
  }
}
