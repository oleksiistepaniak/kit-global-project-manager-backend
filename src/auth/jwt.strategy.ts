import { ExtractJwt, Strategy } from "passport-jwt";
import { PassportStrategy } from "@nestjs/passport";
import { Injectable } from "@nestjs/common";
import { IPayloadStruct } from "./types";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor() {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            // TODO: from config should be taken
            secretOrKey: "SUPER_SECRET_KEY_FOR_KIT_GLOBAL",
        });
    }

    validate(payload: IPayloadStruct) {
        return { userId: payload.sub, email: payload.email };
    }
}
