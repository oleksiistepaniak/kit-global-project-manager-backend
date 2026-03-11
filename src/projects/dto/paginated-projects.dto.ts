import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ProjectResponseDto } from "./project.dto";

export class PaginatedProjectsResponseDto {
    @ApiProperty({ type: [ProjectResponseDto], description: "List of projects" })
    data: ProjectResponseDto[];

    @ApiPropertyOptional({ example: "65f1a2b3c4d5e6f7a8b9c0d1", description: "Cursor for the next page" })
    nextCursor: string | null;
}
