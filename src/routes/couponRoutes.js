import { Router } from "express";
import {
  createCoupon,
  updateCoupon,
  deleteCoupon,
  getCoupons,
  applyCoupon,
} from "../controllers/couponController.js";
import { verifyJWT, isAdmin } from "../middlewares/authMiddleware.js";
import { couponCreateValidator, couponUpdateValidator } from "../validators/couponValidator.js";

const router = Router();

// Protect all coupon routes
router.use(verifyJWT);

// Customer endpoints
router.get("/", getCoupons);
router.post("/apply", applyCoupon);

// Admin-only endpoints
router.post("/", isAdmin, couponCreateValidator, createCoupon);
router.put("/:id", isAdmin, couponUpdateValidator, updateCoupon);
router.delete("/:id", isAdmin, deleteCoupon);

export default router;
