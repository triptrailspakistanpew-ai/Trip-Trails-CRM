import "express-async-errors";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import hpp from "hpp";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { env } from "./config/env";
import routes from "./routes";
import { errorMiddleware, notFoundMiddleware } from "./middleware/error.middleware";

/** 5 login attempts per 15 minutes per IP */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, please try again later.", code: "RATE_LIMITED" },
  skipSuccessfulRequests: false,
});

/** 300 general requests per 15 minutes per IP */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, please try again later.", code: "RATE_LIMITED" },
});

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.frontendUrl,
      credentials: true,
    })
  );
  app.use(compression());
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(hpp());

  if (env.nodeEnv !== "test") {
    app.use(morgan("dev"));
  }

  // Apply strict limiter on auth mutation routes
  const apiPrefix = `/api/${env.apiVersion}`;
  app.use(`${apiPrefix}/auth/login`, authLimiter);
  app.use(`${apiPrefix}/auth/refresh-token`, authLimiter);

  // Apply general limiter to all API routes
  app.use(apiPrefix, generalLimiter);

  app.use(apiPrefix, routes);
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}
