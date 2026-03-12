import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Expose, Transform, Type } from "class-transformer";
import { MongoDoc } from "../../common/types";

interface RawTaskDoc extends MongoDoc {
    projectId?: { toString(): string };
    ownerId?: { toString(): string };
    parentTaskId?: { toString(): string } | null;
}

class GeoLocationResponseDto {
    @ApiProperty({ example: "Point", description: "GeoJSON type" })
    @Expose()
    type: string;

    @ApiProperty({ example: [24.0311, 49.8397], description: "[longitude, latitude]" })
    @Expose()
    coordinates: number[];
}

export class TaskResponseDto {
    @ApiProperty({ example: "65f1a2b3c4d5e6f7a8b9c111", description: "Unique ID of the task" })
    @Expose()
    @Transform(({ obj }): string => {
        const document = obj as RawTaskDoc;
        return document._id?.toString() ?? document.id?.toString() ?? "";
    })
    id: string;

    @ApiProperty({ example: "Setup CI/CD Pipeline", description: "Title of the task" })
    @Expose()
    title: string;

    @ApiPropertyOptional({ example: "Configure GitHub Actions", description: "Task description" })
    @Expose()
    description?: string;

    @ApiProperty({ example: "TODO", description: "Current status of the task" })
    @Expose()
    status: string;

    @ApiPropertyOptional({ example: "2026-03-20T12:00:00.000Z", description: "Deadline date" })
    @Expose()
    deadline?: Date;

    @ApiProperty({ type: [String], example: ["backend", "devops"], description: "Tags for filtering" })
    @Expose()
    tags: string[];

    @ApiProperty({ example: "65f0a1b2c3d4e5f6a7b8c9d0", description: "Project ID" })
    @Expose()
    @Transform(({ obj }): string => {
        const document = obj as RawTaskDoc;
        return document.projectId?.toString() ?? "";
    })
    projectId: string;

    @ApiProperty({ example: "65f0a1b2c3d4e5f6a7b8c9d1", description: "Owner ID" })
    @Expose()
    @Transform(({ obj }): string => {
        const document = obj as RawTaskDoc;
        return document.ownerId?.toString() ?? "";
    })
    ownerId: string;

    @ApiPropertyOptional({ example: "65f1a2b3c4d5e6f7a8b9c222", description: "Parent Task ID if this is a subtask" })
    @Expose()
    @Transform(({ obj }): string | null => {
        const document = obj as RawTaskDoc;
        return document.parentTaskId ? document.parentTaskId.toString() : null;
    })
    parentTaskId?: string | null;

    @ApiPropertyOptional({ type: GeoLocationResponseDto, description: "Task location" })
    @Expose()
    @Type(() => GeoLocationResponseDto)
    location?: GeoLocationResponseDto;

    @ApiProperty({ example: "2026-03-12T12:00:00.000Z" })
    @Expose()
    createdAt: Date;

    @ApiProperty({ example: "2026-03-12T12:00:00.000Z" })
    @Expose()
    updatedAt: Date;
}
