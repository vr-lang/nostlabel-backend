import { validationResult } from "express-validator";
import { ApiError } from "../utils/apiError.js";

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }
  
  const extractedErrors = errors.array().map((err) => {
    return {
      field: err.path || err.param,
      message: err.msg,
    };
  });

  throw new ApiError(422, "Validation failed", extractedErrors);
};

export { validate };
