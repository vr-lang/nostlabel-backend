import { Router } from "express";
import {
  adminLoginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  forgotPassword,
  verifyResetOTP,
  resendResetOTP,
  resetPassword,
} from "../controllers/authController.js";
import { verifyJWT, isAdmin } from "../middlewares/authMiddleware.js";
import {
  loginValidator,
  changePasswordValidator,
  resetPasswordValidator,
  forgotPasswordValidator,
  verifyResetOTPValidator,
  resendResetOTPValidator,
} from "../validators/authValidator.js";
import { authLimiter } from "../middlewares/rateLimiter.js";

const router = Router();

// Public admin auth routes
router.post("/login", authLimiter, loginValidator, adminLoginUser);
router.post("/refresh-token", refreshAccessToken);
router.post("/forgot-password", forgotPasswordValidator, forgotPassword);
router.post("/verify-reset-otp", verifyResetOTPValidator, verifyResetOTP);
router.post("/resend-reset-otp", resendResetOTPValidator, resendResetOTP);
router.post("/reset-password", resetPasswordValidator, resetPassword);

// Protected admin auth routes (Enforce JWT and Admin role checks)
router.use(verifyJWT, isAdmin);

router.post("/logout", logoutUser);
router.post("/change-password", changePasswordValidator, changeCurrentPassword);
router.get("/me", getCurrentUser);

export default router;
