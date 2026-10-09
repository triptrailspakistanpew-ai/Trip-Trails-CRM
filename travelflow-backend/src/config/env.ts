import dotenv from "dotenv";

dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: parseInt(process.env.PORT ?? "5000", 10),
  apiVersion: process.env.API_VERSION ?? "v1",
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:3000",
  jwtSecret: process.env.JWT_SECRET ?? "dev-jwt-secret-change-in-production-minimum-64-characters-long!!",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "30d",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? "dev-jwt-refresh-secret-change-in-production-minimum-64-chars!!",
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? "60d",
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS ?? "12", 10),
  isProduction: process.env.NODE_ENV === "production",
};
