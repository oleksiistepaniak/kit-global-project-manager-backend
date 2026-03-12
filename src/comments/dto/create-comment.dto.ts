import { ApiProperty } from "@nestjs/swagger";
import { IsMongoId, IsNotEmpty, IsString } from "class-validator";
import { Transform } from "class-transformer";

export class CreateCommentDto {
    @ApiProperty({ example: "I will take this task today!", description: "Text of the comment" })
    @Transform(({ value }): string => (typeof value === "string" ? value.trim() : value))
    @IsString({ message: "invalid_text" })
    @IsNotEmpty({ message: "text_empty" })
    text: string;

    @ApiProperty({ example: "65f0a1b2c3d4e5f6a7b8c9d0", description: "ID of the task" })
    @IsMongoId({ message: "invalid_task_id" })
    @IsNotEmpty({ message: "task_id_empty" })
    taskId: string;
}
