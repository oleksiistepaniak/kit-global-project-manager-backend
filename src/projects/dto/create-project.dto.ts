import { IsNotEmpty, IsOptional, IsString } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";

export class CreateProjectDto {
    @ApiProperty({ example: "E-commerce API", description: "Name of a project" })
    @Transform(({ value }): string => (typeof value === "string" ? value.trim() : value))
    @IsString({ message: "invalid_name" })
    @IsNotEmpty({ message: "name_empty" })
    name: string;

    @ApiPropertyOptional({ example: "Backend for a shop", description: "Description of a project" })
    @IsOptional()
    @Transform(({ value }): string => (typeof value === "string" ? value.trim() : value))
    @IsString({ message: "invalid_description" })
    @IsNotEmpty({ message: "description_empty" })
    description?: string;
}
