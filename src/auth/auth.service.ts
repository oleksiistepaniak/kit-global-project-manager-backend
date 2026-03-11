import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { User, UserDocument } from "./schemas/user.schema";
import { IPayloadStruct } from "./types";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";

@Injectable()
export class AuthService {
    constructor(
        @InjectModel(User.name) private userModel: Model<UserDocument>,
        private jwtService: JwtService,
    ) {}

    async register(registerDto: RegisterDto) {
        const { email, password, username, firstName, lastName } = registerDto;

        const existingUser = await this.userModel.findOne({
            $or: [{ email }, { username }],
        });

        if (existingUser) throw new BadRequestException("duplicated_email_or_username");

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await this.userModel.create({
            username,
            firstName,
            lastName,
            email,
            password: hashedPassword,
        });

        return this.generateToken(newUser._id.toString(), newUser.email);
    }

    async login(loginDto: LoginDto) {
        const { email, password } = loginDto;

        const user = await this.userModel.findOne({ email });

        if (!user) throw new UnauthorizedException("wrong_password_or_email");

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) throw new UnauthorizedException("wrong_password_or_email");

        return this.generateToken(user._id.toString(), user.email);
    }

    private generateToken(userId: string, email: string) {
        const payload: IPayloadStruct = { sub: userId, email };
        return {
            access_token: this.jwtService.sign(payload),
        };
    }
}
