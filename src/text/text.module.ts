import { Module } from '@nestjs/common';
import { TextController } from './text.controller';
import { TextService } from './text.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  controllers: [TextController],
  providers: [TextService],
})
export class TextModule {} 