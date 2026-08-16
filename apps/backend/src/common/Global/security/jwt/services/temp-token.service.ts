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
    const status = this.jwtService.sign(payload, {
      secret: this.configService.get('jwt.temp.secret'),
      expiresIn: '3m', // OTP verification window
    });
    console.log(status);

    return status;
  }

  async verify<T extends object>(token: string): Promise<T> {
    const status = await this.jwtService.verifyAsync<T>(token, {
      secret: this.configService.get('jwt.temp.secret'),
    });
    console.log(status);
    return status;
  }
}
