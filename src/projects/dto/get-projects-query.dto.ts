import { IsOptional, IsString, IsIn, IsInt, Min } from "class-validator";
import { Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class GetProjectsQueryDto {
    @ApiPropertyOptional({ description: "Search by project name (case-insensitive)" })
    @IsOptional()
    @IsString({ message: "invalid_name" })
    name?: string;

    @ApiPropertyOptional({ description: "Search by project description (case-insensitive)" })
    @IsOptional()
    @IsString({ message: "invalid_description" })
    description?: string;

    @ApiPropertyOptional({ enum: ["asc", "desc"], default: "desc", description: "Sort by createdAt" })
    @IsOptional()
    @IsIn(["asc", "desc"], { message: "invalid_sort_order" })
    sortOrder?: "asc" | "desc" = "desc";

    @ApiPropertyOptional({ description: "Cursor for pagination (Project ID from previous response)" })
    @IsOptional()
    @IsString({ message: "invalid_cursor" })
    cursor?: string;

    @ApiPropertyOptional({ description: "Number of items to return", default: 10 })
    @IsOptional()
    @Type(() => Number)
    @IsInt({ message: "invalid_limit" })
    @Min(1, { message: "invalid_limit" })
    limit?: number = 10;
}
