import { body } from "express-validator";
import { validate } from "./validate.js";

const productCreateValidator = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Product name is required")
    .isLength({ min: 3 })
    .withMessage("Product name must be at least 3 characters long"),
  body("description").trim().notEmpty().withMessage("Description is required"),
  body("brand").optional().trim(),
  body("category").notEmpty().withMessage("Category ID is required").isMongoId().withMessage("Invalid Category ID format"),
  body("price")
    .notEmpty()
    .withMessage("Base price is required")
    .isFloat({ min: 0 })
    .withMessage("Price must be a positive number"),
  body("discountPrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Discount price must be a positive number")
    .custom((value, { req }) => {
      if (value && parseFloat(value) >= parseFloat(req.body.price)) {
        throw new Error("Discount price must be less than regular price");
      }
      return true;
    }),
  body("sizes")
    .optional()
    .isArray()
    .withMessage("Sizes must be an array of strings"),
  body("colors")
    .optional()
    .isArray()
    .withMessage("Colors must be an array of strings"),
  body("status")
    .optional()
    .isIn(["ACTIVE", "DRAFT", "OUT_OF_STOCK"])
    .withMessage("Status must be ACTIVE, DRAFT, or OUT_OF_STOCK"),
  body("variants")
    .optional()
    .isArray()
    .withMessage("Variants must be an array of objects"),
  body("variants.*.size")
    .optional()
    .isIn(["S", "M", "L", "XL", "XXL"])
    .withMessage("Variant size must be S, M, L, XL, or XXL"),
  body("variants.*.color")
    .optional()
    .notEmpty()
    .withMessage("Variant color is required"),
  body("variants.*.stock")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Variant stock must be a non-negative integer"),
  body("variants.*.sku")
    .optional()
    .notEmpty()
    .withMessage("Variant SKU is required"),
  body("seoTitle").optional().trim(),
  body("seoDescription").optional().trim(),
  validate,
];

const productUpdateValidator = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 3 })
    .withMessage("Product name must be at least 3 characters long"),
  body("description").optional().trim(),
  body("brand").optional().trim(),
  body("category").optional().isMongoId().withMessage("Invalid Category ID format"),
  body("price")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Price must be a positive number"),
  body("discountPrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Discount price must be a positive number")
    .custom((value, { req }) => {
      if (value && req.body.price && parseFloat(value) >= parseFloat(req.body.price)) {
        throw new Error("Discount price must be less than regular price");
      }
      return true;
    }),
  body("sizes")
    .optional()
    .isArray()
    .withMessage("Sizes must be an array of strings"),
  body("colors")
    .optional()
    .isArray()
    .withMessage("Colors must be an array of strings"),
  body("status")
    .optional()
    .isIn(["ACTIVE", "DRAFT", "OUT_OF_STOCK"])
    .withMessage("Status must be ACTIVE, DRAFT, or OUT_OF_STOCK"),
  body("variants")
    .optional()
    .isArray()
    .withMessage("Variants must be an array of objects"),
  body("variants.*.size")
    .optional()
    .isIn(["S", "M", "L", "XL", "XXL"])
    .withMessage("Variant size must be S, M, L, XL, or XXL"),
  body("variants.*.color")
    .optional()
    .notEmpty()
    .withMessage("Variant color is required"),
  body("variants.*.stock")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Variant stock must be a non-negative integer"),
  body("variants.*.sku")
    .optional()
    .notEmpty()
    .withMessage("Variant SKU is required"),
  validate,
];

export { productCreateValidator, productUpdateValidator };
