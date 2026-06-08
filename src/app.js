import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import mongoSanitize from "express-mongo-sanitize";
import xss from "xss-clean";
import swaggerUi from "swagger-ui-express";
import dotenv from "dotenv";

import apiRouter from "./routes/index.js";
import { errorHandler } from "./middlewares/errorMiddleware.js";
import { apiLimiter } from "./middlewares/rateLimiter.js";
import swaggerSpec from "./docs/swagger.js";
import { ApiError } from "./utils/apiError.js";

dotenv.config();

const app = express();

// 1. Logging Middleware
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// 2. Security Middlewares
app.use(helmet());
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://nostlabel-frontend.vercel.app",
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.log("Blocked by CORS:", origin);

      return callback(new Error(`Origin not allowed: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
    ],
  })
);

// 3. Rate Limiter (Apply globally to /api/ routes)
app.use("/api", apiLimiter);

// 4. Request Parsers
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(cookieParser());

// 5. Data Sanitization
app.use(mongoSanitize()); // Prevent NoSQL Injection
app.use(xss()); // Prevent XSS Attacks

// 6. Serve API Docs
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Redirect root to api docs for easy developer exploration
app.get("/", (req, res) => {
  res.redirect("/api-docs");
});

// 7. Mount Application Routes
app.use("/api", apiRouter);

// 8. 404 handler
app.all("*", (req, res, next) => {
  next(new ApiError(404, `Route ${req.originalUrl} not found on this server`));
});

// 9. Centralized Error Handler
app.use(errorHandler);

export default app;
