import { Router } from "express";
import {
  placeOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
} from "../controllers/orderController.js";
import { verifyJWT } from "../middlewares/authMiddleware.js";
import { orderCreateValidator } from "../validators/orderValidator.js";

const router = Router();

// Protect all order routes
router.use(verifyJWT);

router.post("/", orderCreateValidator, placeOrder);
router.get("/me", getMyOrders);
router.get("/:id", getOrderById);
router.put("/:id/cancel", cancelOrder);

export default router;
