import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty } from "class-validator";

export class CreateTodoDto {
  @ApiProperty({
    description: "The title of the todo",
    example: "Buy groceries",
  })
  @IsString()
  @IsNotEmpty()
  title: string;
}
