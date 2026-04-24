import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TempTokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  sign(payload: object) {
    return this.jwtService.sign(payload, {
      secret: this.configService.get('jwt.temp.secret'),
      expiresIn: '3m', // OTP verification window
    });
  }

  async verify<T extends object>(token: string): Promise<T> {
    return this.jwtService.verifyAsync<T>(token, {
      secret: this.configService.get('jwt.temp.secret'),
    });
  }
}
