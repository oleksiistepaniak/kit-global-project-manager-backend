import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString } from "class-validator";

export class LoginDto {
    @ApiProperty({ example: "alex@example.com", description: "Your email in the system" })
    @IsEmail({}, { message: "invalid_email" })
    email: string;

    @ApiProperty({ example: "StRoNgPaSsWOrd228", description: "Your password in the system" })
    @IsString({ message: "invalid_password" })
    @IsNotEmpty({ message: "password_empty" })
    password: string;
}
