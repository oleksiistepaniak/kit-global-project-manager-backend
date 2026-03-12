import { ApiProperty } from "@nestjs/swagger";
import { TaskResponseDto } from "./task.dto";

export class PaginatedTasksResponseDto {
    @ApiProperty({ type: [TaskResponseDto] })
    data: TaskResponseDto[];

    @ApiProperty({ description: "Cursor for the next page, or null if end of list", nullable: true })
    nextCursor: string | null;
}
