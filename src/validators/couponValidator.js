import { body } from "express-validator";
import { validate } from "./validate.js";

const couponCreateValidator = [
  body("code")
    .trim()
    .notEmpty()
    .withMessage("Coupon code is required")
    .isLength({ min: 3, max: 15 })
    .withMessage("Coupon code must be between 3 and 15 characters long")
    .toUpperCase(),
  body("discountType")
    .notEmpty()
    .withMessage("Discount type is required")
    .isIn(["PERCENTAGE", "FIXED"])
    .withMessage("Discount type must be PERCENTAGE or FIXED"),
  body("discountValue")
    .notEmpty()
    .withMessage("Discount value is required")
    .isFloat({ min: 0.01 })
    .withMessage("Discount value must be greater than 0"),
  body("minimumOrderValue")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Minimum order value must be a non-negative number"),
  body("usageLimit")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Usage limit must be at least 1"),
  body("expiryDate")
    .notEmpty()
    .withMessage("Expiry date is required")
    .isISO8601()
    .withMessage("Expiry date must be a valid ISO8601 date format")
    .custom((value) => {
      if (new Date(value) <= new Date()) {
        throw new Error("Expiry date must be in the future");
      }
      return true;
    }),
  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean value"),
  validate,
];

const couponUpdateValidator = [
  body("code")
    .optional()
    .trim()
    .isLength({ min: 3, max: 15 })
    .withMessage("Coupon code must be between 3 and 15 characters long")
    .toUpperCase(),
  body("discountType")
    .optional()
    .isIn(["PERCENTAGE", "FIXED"])
    .withMessage("Discount type must be PERCENTAGE or FIXED"),
  body("discountValue")
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage("Discount value must be greater than 0"),
  body("minimumOrderValue")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Minimum order value must be a non-negative number"),
  body("usageLimit")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Usage limit must be at least 1"),
  body("expiryDate")
    .optional()
    .isISO8601()
    .withMessage("Expiry date must be a valid ISO8601 date format")
    .custom((value) => {
      if (new Date(value) <= new Date()) {
        throw new Error("Expiry date must be in the future");
      }
      return true;
    }),
  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean value"),
  validate,
];

export { couponCreateValidator, couponUpdateValidator };
