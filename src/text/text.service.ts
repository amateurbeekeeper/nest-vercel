import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UpdateTextDto } from './dto/update-text.dto';
import OpenAI from 'openai';

@Injectable()
export class TextService {
  private readonly logger = new Logger(TextService.name);
  private readonly openai: OpenAI;

  constructor(private readonly configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async updateText(updateTextDto: UpdateTextDto) {
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a professional copywriter helping to improve text.',
          },
          {
            role: 'user',
            content: `Original text: "${updateTextDto.originalText}"\nComment: "${updateTextDto.comment}"\nInstructions: "${updateTextDto.prompt}"\nPlease provide an improved version of the text.`,
          },
        ],
      });

      const newText = completion.choices[0]?.message?.content || updateTextDto.originalText;
      
      this.logger.log(`Text updated successfully: ${newText}`);
      
      return { newText };
    } catch (error) {
      this.logger.error(`Error updating text: ${error.message}`);
      throw error;
    }
  }
} 