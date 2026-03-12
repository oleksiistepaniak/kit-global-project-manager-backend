import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";

class StatusCount {
    @ApiProperty({ example: "TODO" })
    @Expose()
    status: string;

    @ApiProperty({ example: 12 })
    @Expose()
    count: number;
}

class TagCount {
    @ApiProperty({ example: "backend" })
    @Expose()
    tag: string;

    @ApiProperty({ example: 5 })
    @Expose()
    count: number;
}

export class TaskAnalyticsResponseDto {
    @ApiProperty({ example: 42, description: "Total number of tasks in the project" })
    @Expose()
    totalTasks: number;

    @ApiProperty({ example: 3, description: "Number of overdue tasks (deadline passed, not DONE)" })
    @Expose()
    overdueTasks: number;

    @ApiProperty({ type: [StatusCount], description: "Task count grouped by status" })
    @Expose()
    @Type(() => StatusCount)
    statusCounts: StatusCount[];

    @ApiProperty({ type: [TagCount], description: "Top 5 most used tags" })
    @Expose()
    @Type(() => TagCount)
    topTags: TagCount[];
}
