import { ExtractJwt, Strategy } from "passport-jwt";
import { PassportStrategy } from "@nestjs/passport";
import { Injectable } from "@nestjs/common";
import { IPayloadStruct } from "./types";
import { AppConfig } from "../config/app.config";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor() {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: AppConfig.jwtSecret,
        });
    }

    validate(payload: IPayloadStruct) {
        return { userId: payload.sub, email: payload.email };
    }
}
