import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { TextService } from './text.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateTextDto } from './dto/update-text.dto';

@ApiTags('Text Processing')
@Controller('text')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TextController {
  constructor(private readonly textService: TextService) {}

  @Post('update')
  @ApiOperation({ summary: 'Update text using OpenAI' })
  @ApiResponse({ status: 200, description: 'Returns updated text' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateText(@Body() updateTextDto: UpdateTextDto) {
    return this.textService.updateText(updateTextDto);
  }
} 