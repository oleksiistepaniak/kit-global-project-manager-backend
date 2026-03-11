import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Expose, Transform } from "class-transformer";
import { MongoDoc } from "../../common/types";

export class ProjectResponseDto {
    @ApiProperty({ example: "65f1a2b3c4d5e6f7a8b9c0d1", description: "Unique ID of a project" })
    @Expose()
    @Transform(({ obj }): string => {
        const document = obj as MongoDoc;
        return document._id?.toString() ?? document.id?.toString() ?? "";
    })
    id: string;

    @ApiProperty({ example: "E-commerce API", description: "Name of a project" })
    @Expose()
    name: string;

    @ApiPropertyOptional({ example: "Backend for a shop", description: "Description of a project" })
    @Expose()
    description?: string;

    @ApiProperty({ example: "2026-03-10T20:49:05.000Z" })
    @Expose()
    createdAt: Date;

    @ApiProperty({ example: "2026-03-10T20:49:05.000Z" })
    @Expose()
    updatedAt: Date;
}
