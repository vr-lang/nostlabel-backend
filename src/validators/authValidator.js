import { body } from "express-validator";
import { validate } from "./validate.js";

const registerValidator = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ min: 2 })
    .withMessage("Name must be at least 2 characters long"),
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please enter a valid email address"),
  body("phone")
    .trim()
    .notEmpty()
    .withMessage("Phone number is required")
    .isMobilePhone()
    .withMessage("Please enter a valid phone number"),
  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
  validate,
];

const loginValidator = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please enter a valid email address"),
  body("password")
    .notEmpty()
    .withMessage("Password is required"),
  validate,
];

const changePasswordValidator = [
  body("oldPassword").notEmpty().withMessage("Old password is required"),
  body("newPassword")
    .notEmpty()
    .withMessage("New password is required")
    .isLength({ min: 6 })
    .withMessage("New password must be at least 6 characters long"),
  validate,
];

const resetPasswordValidator = [
  body("resetSessionToken")
    .notEmpty()
    .withMessage("Reset session token is required"),
  body("newPassword")
    .notEmpty()
    .withMessage("New password is required")
    .isLength({ min: 6 })
    .withMessage("New password must be at least 6 characters long"),
  validate,
];

const verifyResetOTPValidator = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please enter a valid email address"),
  body("otp")
    .trim()
    .notEmpty()
    .withMessage("OTP is required")
    .isNumeric()
    .withMessage("OTP must be numeric")
    .isLength({ min: 6, max: 6 })
    .withMessage("OTP must be exactly 6 digits long"),
  validate,
];

const resendResetOTPValidator = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please enter a valid email address"),
  validate,
];

const forgotPasswordValidator = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please enter a valid email address"),
  validate,
];

const addressValidator = [
  body("fullName").trim().notEmpty().withMessage("Full name is required"),
  body("phone").trim().notEmpty().withMessage("Phone number is required"),
  body("addressLine1").trim().notEmpty().withMessage("Address line 1 is required"),
  body("addressLine2").trim().optional(),
  body("city").trim().notEmpty().withMessage("City is required"),
  body("state").trim().notEmpty().withMessage("State is required"),
  body("country").trim().optional(),
  body("postalCode")
    .trim()
    .notEmpty()
    .withMessage("Postal code is required")
    .isLength({ min: 5, max: 10 })
    .withMessage("Postal code must be between 5 and 10 characters"),
  body("isDefault").optional().isBoolean().withMessage("isDefault must be a boolean"),
  body("addressType")
    .optional()
    .trim()
    .toUpperCase()
    .isIn(["HOME", "OFFICE", "OTHER"])
    .withMessage("Address type must be HOME, OFFICE, or OTHER"),
  validate,
];

const sendEmailOTPValidator = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please enter a valid email address"),
  validate,
];

const verifyEmailOTPValidator = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please enter a valid email address"),
  body("otp")
    .trim()
    .notEmpty()
    .withMessage("OTP is required")
    .isNumeric()
    .withMessage("OTP must be numeric")
    .isLength({ min: 6, max: 6 })
    .withMessage("OTP must be exactly 6 digits long"),
  validate,
];

const resendEmailOTPValidator = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please enter a valid email address"),
  validate,
];

export {
  registerValidator,
  loginValidator,
  changePasswordValidator,
  resetPasswordValidator,
  forgotPasswordValidator,
  verifyResetOTPValidator,
  resendResetOTPValidator,
  addressValidator,
  sendEmailOTPValidator,
  verifyEmailOTPValidator,
  resendEmailOTPValidator,
};
