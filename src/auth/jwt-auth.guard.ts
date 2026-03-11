import { Injectable, UnauthorizedException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
    handleRequest<TUser>(err: unknown, user: unknown): TUser {
        if (err || !user) {
            if (err instanceof Error) throw err;

            throw new UnauthorizedException(["unauthorized"]);
        }

        return user as TUser;
    }
}
