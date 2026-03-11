import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Expose, Transform } from "class-transformer";
import { MongoDoc } from "../../common/types";

interface RawProjectDoc extends MongoDoc {
    ownerId?: { toString(): string };
    members?: { toString(): string }[];
}

export class ProjectResponseDto {
    @ApiProperty({ example: "65f1a2b3c4d5e6f7a8b9c0d1", description: "Unique ID of a project" })
    @Expose()
    @Transform(({ obj }): string => {
        const document = obj as RawProjectDoc;
        return document._id?.toString() ?? document.id?.toString() ?? "";
    })
    id: string;

    @ApiProperty({ example: "E-commerce API", description: "Name of a project" })
    @Expose()
    name: string;

    @ApiPropertyOptional({ example: "Backend for a shop", description: "Description of a project" })
    @Expose()
    description?: string;

    @ApiProperty({ example: "65f0a1b2c3d4e5f6a7b8c9d0", description: "ID of the project owner" })
    @Expose()
    @Transform(({ obj }): string => {
        const document = obj as RawProjectDoc;
        return document.ownerId?.toString() ?? "";
    })
    ownerId: string;

    @ApiProperty({
        type: [String],
        example: ["65f0a1b2c3d4e5f6a7b8c9d1", "65f0a1b2c3d4e5f6a7b8c9d2"],
        description: "List of user IDs who have access to the project",
    })
    @Expose()
    @Transform(({ obj }): string[] => {
        const document = obj as RawProjectDoc;
        if (!document.members || !Array.isArray(document.members)) return [];
        return document.members.map((memberId) => memberId.toString());
    })
    members: string[];

    @ApiProperty({ example: "2026-03-10T20:49:05.000Z" })
    @Expose()
    createdAt: Date;

    @ApiProperty({ example: "2026-03-10T20:49:05.000Z" })
    @Expose()
    updatedAt: Date;
}
