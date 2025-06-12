import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async validateApiKey(apiKey: string) {
    const validApiKey = this.configService.get<string>('API_KEY');
    
    if (apiKey !== validApiKey) {
      throw new UnauthorizedException('Invalid API key');
    }

    const payload = { sub: 'figma-copy-updater' };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
} 