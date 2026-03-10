import { Controller, Post, Body, HttpCode, HttpStatus } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { RegisterDto, LoginDto } from "./dto/auth.dto";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";

@ApiTags("Authentication")
@Controller("auth")
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post("register")
    @ApiOperation({ summary: "Registration of a new user" })
    @ApiResponse({
        status: 201,
        description: "User is created successfully and JWT token is returned.",
    })
    @ApiResponse({
        status: 400,
        description: "Validation error or email/username already exists",
    })
    register(@Body() registerDto: RegisterDto) {
        return this.authService.register(registerDto);
    }

    @Post("login")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Authentication of a user" })
    @ApiResponse({
        status: 200,
        description: "A successfully authenticated, JWT token is returned.",
    })
    @ApiResponse({ status: 401, description: "Incorrect password or email" })
    login(@Body() loginDto: LoginDto) {
        return this.authService.login(loginDto);
    }
}
