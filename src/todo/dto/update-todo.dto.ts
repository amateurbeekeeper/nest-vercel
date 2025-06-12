import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsBoolean, IsOptional } from "class-validator";

export class UpdateTodoDto {
  @ApiProperty({
    description: "The title of the todo",
    example: "Buy groceries",
    required: false,
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({
    description: "The completion status of the todo",
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  completed?: boolean;
}
