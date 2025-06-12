import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get JWT token' })
  @ApiResponse({ status: 200, description: 'Returns JWT token' })
  @ApiResponse({ status: 401, description: 'Invalid API key' })
  async getToken(@Body('apiKey') apiKey: string) {
    return this.authService.validateApiKey(apiKey);
  }
} 