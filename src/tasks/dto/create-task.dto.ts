import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsArray,
    IsMongoId,
    IsDateString,
    ArrayMinSize,
    ArrayMaxSize,
    IsNumber,
    Equals,
    ValidateNested,
} from "class-validator";
import { Type, Transform } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class GeoLocationDto {
    @ApiProperty({ example: "Point", description: "MongoDB requires this to be exactly 'Point'" })
    @IsString({ message: "invalid_type" })
    @Equals("Point", { message: "type_must_be_point" })
    type: string;

    @ApiProperty({
        example: [24.0311, 49.8397],
        description: "Exact coordinates [longitude, latitude]",
    })
    @IsArray()
    @ArrayMinSize(2, { message: "coordinates_must_have_exactly_2_items" })
    @ArrayMaxSize(2, { message: "coordinates_must_have_exactly_2_items" })
    @IsNumber({}, { each: true, message: "coordinates_must_be_numbers" })
    coordinates: number[];
}

export class CreateTaskDto {
    @ApiProperty({ example: "Setup CI/CD Pipeline", description: "Title of the task" })
    @Transform(({ value }): string => (typeof value === "string" ? value.trim() : value))
    @IsString({ message: "invalid_title" })
    @IsNotEmpty({ message: "title_empty" })
    title: string;

    @ApiPropertyOptional({ example: "Configure GitHub Actions for deployment", description: "Task description" })
    @IsOptional()
    @Transform(({ value }): string => (typeof value === "string" ? value.trim() : value))
    @IsString({ message: "invalid_description" })
    @IsNotEmpty({ message: "description_empty" })
    description?: string;

    @ApiProperty({ example: "65f0a1b2c3d4e5f6a7b8c9d0", description: "ID of the project" })
    @IsMongoId({ message: "invalid_project_id" })
    @IsNotEmpty({ message: "project_id_empty" })
    projectId: string;

    @ApiPropertyOptional({ example: "65f1a2b3...", description: "ID of the parent task (if this is a subtask)" })
    @IsOptional()
    @IsMongoId({ message: "invalid_parent_task_id" })
    parentTaskId?: string;

    @ApiPropertyOptional({ example: "2026-03-20T12:00:00.000Z", description: "Deadline date" })
    @IsOptional()
    @IsDateString({}, { message: "invalid_deadline" })
    deadline?: string;

    @ApiPropertyOptional({ example: ["backend", "devops"], description: "Tags for filtering" })
    @IsOptional()
    @IsArray({ message: "tags_must_be_array" })
    @IsString({ each: true, message: "tag_must_be_string" })
    tags?: string[];

    @ApiPropertyOptional({ type: GeoLocationDto, description: "Geospatial location of the task" })
    @IsOptional()
    @ValidateNested()
    @Type(() => GeoLocationDto)
    location?: GeoLocationDto;
}
