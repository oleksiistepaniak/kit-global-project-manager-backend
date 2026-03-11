import { IsArray, IsMongoId, IsNotEmpty, IsOptional, IsString } from "class-validator";
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

    @ApiPropertyOptional({
        type: [String],
        example: ["65f0a1b2c3d4e5f6a7b8c9d0", "65f0a1b2c3d4e5f6a7b8c9d1"],
        description: "Array of user IDs who have read/comment access to the project",
    })
    @IsArray({ message: "members_must_be_array" })
    @IsMongoId({ each: true, message: "invalid_member_id" })
    @IsOptional()
    members?: string[];
}
