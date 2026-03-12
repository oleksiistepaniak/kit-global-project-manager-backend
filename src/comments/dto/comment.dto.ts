import { ApiProperty } from "@nestjs/swagger";
import { Expose, Transform } from "class-transformer";
import { MongoDoc } from "../../common/types";

interface RawCommentDoc extends MongoDoc {
    taskId?: { toString(): string };
    authorId?: { toString(): string };
}

export class CommentResponseDto {
    @ApiProperty({ example: "65f1a2b3c4d5e6f7a8b9c111" })
    @Expose()
    @Transform(({ obj }): string => {
        const document = obj as RawCommentDoc;
        return document._id?.toString() ?? document.id?.toString() ?? "";
    })
    id: string;

    @ApiProperty({ example: "I will take this task today!" })
    @Expose()
    text: string;

    @ApiProperty({ example: "65f0a1b2c3d4e5f6a7b8c9d0" })
    @Expose()
    @Transform(({ obj }): string => {
        const document = obj as RawCommentDoc;
        return document.taskId?.toString() ?? "";
    })
    taskId: string;

    @ApiProperty({ example: "65f0a1b2c3d4e5f6a7b8c9d1" })
    @Expose()
    @Transform(({ obj }): string => {
        const document = obj as RawCommentDoc;
        return document.authorId?.toString() ?? "";
    })
    authorId: string;

    @ApiProperty()
    @Expose()
    createdAt: Date;

    @ApiProperty()
    @Expose()
    updatedAt: Date;
}
