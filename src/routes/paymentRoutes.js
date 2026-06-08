import { Router } from "express";
import {
  createPaymentOrderForPending,
  verifyPayment,
  razorpayWebhook,
} from "../controllers/paymentController.js";
import { verifyJWT } from "../middlewares/authMiddleware.js";

const router = Router();

// Webhook endpoint (Public, called asynchronously by Razorpay servers)
router.post("/webhook", razorpayWebhook);

// Protected payment routes
router.post("/retry-payment", verifyJWT, createPaymentOrderForPending);
router.post("/verify", verifyJWT, verifyPayment);

export default router;
