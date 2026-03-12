import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsInt, Min, Max, IsEnum, IsNumber } from "class-validator";
import { Type, Transform } from "class-transformer";

const MIN_LIMIT_VALUE = 1;
const MAX_LIMIT_VALUE = 100;

export class GetTasksQueryDto {
    @ApiPropertyOptional({ description: "Cursor for pagination (Task ID)" })
    @IsOptional()
    @IsString({ message: "invalid_cursor" })
    cursor?: string;

    @ApiPropertyOptional({ description: "Number of items to return", default: 10 })
    @IsOptional()
    @Type(() => Number)
    @IsInt({ message: "invalid_limit" })
    @Min(1, { message: `min_limit_is_${MIN_LIMIT_VALUE}` })
    @Max(100, { message: `max_limit_is_${MAX_LIMIT_VALUE}` })
    limit?: number = 10;

    @ApiPropertyOptional({ description: "Regex search by title or description" })
    @IsOptional()
    @IsString({ message: "invalid_search" })
    search?: string;

    @ApiPropertyOptional({ description: "Filter by status (can be array)", type: [String] })
    @IsOptional()
    @Transform(({ value }): string[] => (Array.isArray(value) ? value : [value]))
    status?: string[];

    @ApiPropertyOptional({ description: "Filter by tags (can be array)", type: [String] })
    @IsOptional()
    @Transform(({ value }): string[] => (Array.isArray(value) ? value : [value]))
    tags?: string[];

    @ApiPropertyOptional({ enum: ["createdAt", "deadline"], default: "createdAt" })
    @IsOptional()
    @IsEnum(["createdAt", "deadline"], { message: "invalid_sort_by" })
    sortBy?: "createdAt" | "deadline" = "createdAt";

    @ApiPropertyOptional({ enum: ["asc", "desc"], default: "desc" })
    @IsOptional()
    @IsEnum(["asc", "desc"], { message: "invalid_sort_order" })
    sortOrder?: "asc" | "desc" = "desc";

    @ApiPropertyOptional({ description: "Latitude for GEO search" })
    @IsOptional()
    @Type(() => Number)
    @IsNumber({}, { message: "invalid_lat" })
    lat?: number;

    @ApiPropertyOptional({ description: "Longitude for GEO search" })
    @IsOptional()
    @Type(() => Number)
    @IsNumber({}, { message: "invalid_lng" })
    lng?: number;

    @ApiPropertyOptional({ description: "Search radius in meters", default: 5000 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber({}, { message: "invalid_radius" })
    radius?: number = 5000;
}
