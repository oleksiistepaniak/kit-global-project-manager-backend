import { PartialType, ApiPropertyOptional } from "@nestjs/swagger";
import { CreateTaskDto } from "./create-task.dto";
import { IsEnum, IsOptional, IsString } from "class-validator";

export class UpdateTaskDto extends PartialType(CreateTaskDto) {
    @ApiPropertyOptional({
        enum: ["TODO", "IN_PROGRESS", "DONE"],
        description: "Update the status of the task",
    })
    @IsOptional()
    @IsString()
    @IsEnum(["TODO", "IN_PROGRESS", "DONE"], { message: "invalid_status" })
    status?: string;
}
