import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { printConfig } from "./config/app.config";

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            transform: true,
        }),
    );

    app.useGlobalFilters(new HttpExceptionFilter());

    app.enableCors();

    const config = new DocumentBuilder()
        .setTitle("KIT Global - Task Management API")
        .setDescription("RESTful API for Project and Task management system with GeoJSON and nested tasks support.")
        .setVersion("1.0")
        .addBearerAuth(
            {
                type: "http",
                scheme: "bearer",
                bearerFormat: "JWT",
                name: "JWT",
                description: "Your JWT token without Bearer prefix",
                in: "header",
            },
            "JWT-auth",
        )
        .build();

    const document = SwaggerModule.createDocument(app, config);

    SwaggerModule.setup("api/docs", app, document, {
        swaggerOptions: {
            persistAuthorization: true,
        },
    });

    await app.listen(3000);
    console.log(`🚀 Server started successfully! --> http://localhost:3000`);
    console.log(`📚 Swagger is ready and available! --> http://localhost:3000/api/docs`);
    printConfig();
}

bootstrap().catch((error) => console.error(error));
