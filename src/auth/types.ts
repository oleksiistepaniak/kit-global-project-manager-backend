export interface IPayloadStruct {
    sub: string;
    email: string;
}

export interface JwtPayload {
    userId: string;
    email: string;
}
