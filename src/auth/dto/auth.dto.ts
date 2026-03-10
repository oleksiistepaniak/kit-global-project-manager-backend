import { IsEmail, IsNotEmpty, IsString, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";

const MIN_PASSWORD_LENGTH = 6;

export class RegisterDto {
    @ApiProperty({ example: "oleksiistepaniak", description: "Unique username" })
    @Transform(({ value }): string => (typeof value === "string" ? value.trim() : value))
    @IsString({ message: "invalid_username" })
    @IsNotEmpty({ message: "username_empty" })
    username: string;

    @ApiProperty({ example: "Oleksii", description: "Your name" })
    @Transform(({ value }): string => (typeof value === "string" ? value.trim() : value))
    @IsString({ message: "invalid_firstname" })
    @IsNotEmpty({ message: "first_name_empty" })
    firstName: string;

    @ApiProperty({ example: "Stepaniak", description: "Your surname" })
    @Transform(({ value }): string => (typeof value === "string" ? value.trim() : value))
    @IsString({ message: "invalid_lastname" })
    @IsNotEmpty({ message: "last_name_empty" })
    lastName: string;

    @ApiProperty({ example: "alex@example.com", description: "Unique email" })
    @IsEmail({}, { message: "invalid_email" })
    email: string;

    @ApiProperty({
        example: "StRoNgPaSsWOrd228",
        minLength: MIN_PASSWORD_LENGTH,
        description: "Strong password",
    })
    @IsString({ message: "invalid_password" })
    @MinLength(MIN_PASSWORD_LENGTH, {
        message: `min_password_length_is_${MIN_PASSWORD_LENGTH}`,
    })
    password: string;
}

export class LoginDto {
    @ApiProperty({ example: "alex@example.com", description: "Your email in the system" })
    @IsEmail({}, { message: "invalid_email" })
    email: string;

    @ApiProperty({ example: "StRoNgPaSsWOrd228", description: "Your password in the system" })
    @IsString({ message: "invalid_password" })
    @IsNotEmpty({ message: "password_empty" })
    password: string;
}
