import { body } from "express-validator";
import { validate } from "./validate.js";

const categoryCreateValidator = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Category name is required")
    .isLength({ min: 2 })
    .withMessage("Category name must be at least 2 characters long"),
  body("description").optional().trim(),
  body("status")
    .optional()
    .isIn(["ACTIVE", "DRAFT"])
    .withMessage("Status must be ACTIVE or DRAFT"),
  validate,
];

const categoryUpdateValidator = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage("Category name must be at least 2 characters long"),
  body("description").optional().trim(),
  body("status")
    .optional()
    .isIn(["ACTIVE", "DRAFT"])
    .withMessage("Status must be ACTIVE or DRAFT"),
  validate,
];

export { categoryCreateValidator, categoryUpdateValidator };
