import { Router } from "express";
import {
  registerUser,
  sendEmailOTPHandler,
  verifyEmailOTPHandler,
  resendEmailOTPHandler,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  forgotPassword,
  verifyResetOTP,
  resendResetOTP,
  resetPassword,
  addAddress,
  deleteAddress,
  getAddresses,
  updateCurrentUser,
  updateAddress,
} from "../controllers/authController.js";
import { verifyJWT } from "../middlewares/authMiddleware.js";
import {
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
} from "../validators/authValidator.js";
import { authLimiter, otpLimiter } from "../middlewares/rateLimiter.js";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: Customer registration, verification, and session management APIs
 */

/**
 * @swagger
 * /auth/send-email-otp:
 *   post:
 *     summary: Request email verification OTP
 *     description: Generates a cryptographically secure 6-digit OTP code, hashes it, saves the record, and sends a branded email to verify the user's email address.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: customer@example.com
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *       409:
 *         description: Email is already registered to another account
 *       429:
 *         description: Too many OTP requests from this IP
 */
router.post("/send-email-otp", otpLimiter, sendEmailOTPValidator, sendEmailOTPHandler);

/**
 * @swagger
 * /auth/verify-email-otp:
 *   post:
 *     summary: Verify email verification OTP
 *     description: Compares the submitted 6-digit code with the hashed OTP record. Marks the email verified upon success.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: customer@example.com
 *               otp:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Email verified successfully
 *       400:
 *         description: Invalid OTP or attempt limits exceeded / expired
 *       404:
 *         description: No OTP record found for this email
 */
router.post("/verify-email-otp", otpLimiter, verifyEmailOTPValidator, verifyEmailOTPHandler);

/**
 * @swagger
 * /auth/resend-email-otp:
 *   post:
 *     summary: Resend email verification OTP
 *     description: Throttle-protected endpoint to request a fresh OTP. Requires a 60-second cooldown since the last request.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: customer@example.com
 *     responses:
 *       200:
 *         description: OTP resent successfully
 *       400:
 *         description: Cooldown active (wait 60 seconds)
 *       409:
 *         description: Email is already registered
 */
router.post("/resend-email-otp", otpLimiter, resendEmailOTPValidator, resendEmailOTPHandler);

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new customer account
 *     description: Completes registration once the email has been validated via OTP verification. Automatically issues access/refresh tokens.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - phone
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: customer@example.com
 *               phone:
 *                 type: string
 *                 example: "9876543210"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: Password123
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Email has not been verified
 *       409:
 *         description: Email already registered
 */
router.post("/register", authLimiter, registerValidator, registerUser);
router.post("/login", authLimiter, loginValidator, loginUser);
router.post("/refresh-token", refreshAccessToken);
router.post("/forgot-password", forgotPasswordValidator, forgotPassword);
router.post("/verify-reset-otp", verifyResetOTPValidator, verifyResetOTP);
router.post("/resend-reset-otp", resendResetOTPValidator, resendResetOTP);
router.post("/reset-password", resetPasswordValidator, resetPassword);

// Protected auth routes
router.use(verifyJWT);

router.post("/logout", logoutUser);
router.post("/change-password", changePasswordValidator, changeCurrentPassword);
router.route("/me")
  .get(getCurrentUser)
  .put(updateCurrentUser);

// Address sub-routes
router.route("/addresses")
  .get(getAddresses)
  .post(addressValidator, addAddress);

router.route("/addresses/:addressId")
  .put(addressValidator, updateAddress)
  .delete(deleteAddress);

export default router;
