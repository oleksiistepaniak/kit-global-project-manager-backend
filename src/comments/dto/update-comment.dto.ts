import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";
import { Transform } from "class-transformer";

export class UpdateCommentDto {
    @ApiProperty({ example: "Updated text", description: "New text for the comment" })
    @Transform(({ value }): string => (typeof value === "string" ? value.trim() : value))
    @IsString({ message: "invalid_text" })
    @IsNotEmpty({ message: "text_empty" })
    text: string;
}
