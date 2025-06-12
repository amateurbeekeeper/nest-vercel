import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class UpdateTextDto {
  @ApiProperty({
    description: 'The original text to update',
    example: 'Welcome to our website',
  })
  @IsString()
  @IsNotEmpty()
  originalText: string;

  @ApiProperty({
    description: 'Comments about the text',
    example: 'Make it more engaging',
  })
  @IsString()
  @IsNotEmpty()
  comment: string;

  @ApiProperty({
    description: 'Instructions for the update',
    example: 'Add excitement and call to action',
  })
  @IsString()
  @IsNotEmpty()
  prompt: string;
} 