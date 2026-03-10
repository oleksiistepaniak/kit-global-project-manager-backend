import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from "@nestjs/common";
import { Response, Request } from "express";

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
    catch(exception: HttpException, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();
        const status = exception.getStatus();

        const exceptionResponse = exception.getResponse() as string | Record<string, unknown>;

        let rawMessage: unknown;
        let errorName = exception.name;

        if (typeof exceptionResponse === "object" && exceptionResponse !== null) {
            rawMessage = exceptionResponse.message ?? exceptionResponse;
            errorName = (exceptionResponse.error as string) ?? exception.name;
        } else {
            rawMessage = exceptionResponse;
        }

        const finalMessages = Array.isArray(rawMessage) ? rawMessage : [String(rawMessage)];

        response.status(status).json({
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: request.url,
            messages: finalMessages,
            error: errorName,
        });
    }
}
