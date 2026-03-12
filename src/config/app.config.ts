import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env") });

export const AppConfig = {
    mongoUri: process.env.MONGO_URI || "mongodb://localhost:27017/kit_global_task",

    jwtSecret: process.env.JWT_SECRET || "SUPER_SECRET_KEY_FOR_KIT_GLOBAL",

    jwtExpiresIn: (process.env.JWT_EXPIRES_IN || "24h") as "24h",

    port: parseInt(process.env.PORT || "3000", 10),

    isProduction: process.env.NODE_ENV === "production",
};

export function printConfig() {
    console.log(`MongoDB URI: ${AppConfig.mongoUri}`);
    console.log(`PORT: ${AppConfig.port}`);
    console.log(`Is production: ${AppConfig.isProduction}`);
}

export type IAppConfig = typeof AppConfig;
