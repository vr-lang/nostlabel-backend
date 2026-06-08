import { ApiError } from "../utils/apiError.js";

const errorHandler = (err, req, res, next) => {
  let error = err;

  // If error is not an instance of ApiError, create a new ApiError
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || (error.name === "ValidationError" ? 400 : 500);
    const message = error.message || "Internal Server Error";
    error = new ApiError(statusCode, message, error?.errors || [], err.stack);
  }

  // Handle specific database errors
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    error = new ApiError(400, `Duplicate value for field: ${field}. Please use another value.`);
  }

  // Handle Multer errors gracefully
  if (err.name === "MulterError" || err.message?.includes("MulterError")) {
    const message = err.code === "LIMIT_FILE_SIZE" ? "File size exceeds the 10MB limit" : err.message;
    error = new ApiError(400, message);
  }

  const response = {
    success: false,
    message: error.message,
    errors: error.errors || [],
    ...(process.env.NODE_ENV === "development" ? { stack: error.stack } : {}),
  };

  return res.status(error.statusCode).json(response);
};

export { errorHandler };
