import { Router } from "express";
import authRoutes from "./authRoutes.js";
import adminAuthRoutes from "./adminAuthRoutes.js";
import adminRoutes from "./adminRoutes.js";
import productRoutes from "./productRoutes.js";
import categoryRoutes from "./categoryRoutes.js";
import cartRoutes from "./cartRoutes.js";
import wishlistRoutes from "./wishlistRoutes.js";
import couponRoutes from "./couponRoutes.js";
import orderRoutes from "./orderRoutes.js";
import paymentRoutes from "./paymentRoutes.js";
import reviewRoutes from "./reviewRoutes.js";
import uploadRoutes from "./uploadRoutes.js";
import debugRoutes from "./debugRoutes.js";
import exchangeRoutes from "./exchangeRoutes.js";

const router = Router();

// Lightweight health check endpoint
router.get("/health", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Server is warm and healthy",
    timestamp: new Date(),
  });
});

// Mount API routes
router.use("/auth", authRoutes);
router.use("/admin/auth", adminAuthRoutes);
router.use("/admin", adminRoutes);
router.use("/products", productRoutes);
router.use("/categories", categoryRoutes);
router.use("/cart", cartRoutes);
router.use("/wishlist", wishlistRoutes);
router.use("/coupons", couponRoutes);
router.use("/orders", orderRoutes);
router.use("/payments", paymentRoutes);
router.use("/reviews", reviewRoutes);
router.use("/upload", uploadRoutes);
router.use("/debug", debugRoutes);
router.use("/exchange", exchangeRoutes);

export default router;
