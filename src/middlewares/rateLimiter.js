import rateLimit from "express-rate-limit";
import { ApiError } from "../utils/apiError.js";

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window`
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    return req.originalUrl && req.originalUrl.includes("/admin");
  },
  handler: (req, res, next, options) => {
    throw new ApiError(429, "Too many requests from this IP, please try again after 15 minutes");
  },
});

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 15, // Limit each IP to 15 login/register attempts per hour
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return req.originalUrl && req.originalUrl.includes("/admin");
  },
  handler: (req, res, next, options) => {
    throw new ApiError(429, "Too many login/verification attempts from this IP, please try again after 1 hour");
  },
});

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 OTP requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    throw new ApiError(429, "Too many OTP requests from this IP. Please try again after 15 minutes");
  },
});

export { apiLimiter, authLimiter, otpLimiter };
