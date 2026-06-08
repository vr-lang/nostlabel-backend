import { body } from "express-validator";
import { validate } from "./validate.js";

const reviewCreateValidator = [
  body("product")
    .notEmpty()
    .withMessage("Product ID is required")
    .isMongoId()
    .withMessage("Invalid product ID format"),
  body("rating")
    .notEmpty()
    .withMessage("Rating is required")
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating must be an integer between 1 and 5"),
  body("comment")
    .trim()
    .notEmpty()
    .withMessage("Comment comment is required")
    .isLength({ min: 3, max: 500 })
    .withMessage("Comment must be between 3 and 500 characters long"),
  validate,
];

const reviewUpdateValidator = [
  body("rating")
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating must be an integer between 1 and 5"),
  body("comment")
    .optional()
    .trim()
    .isLength({ min: 3, max: 500 })
    .withMessage("Comment must be between 3 and 500 characters long"),
  validate,
];

export { reviewCreateValidator, reviewUpdateValidator };
