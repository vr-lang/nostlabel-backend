import { Router } from "express";
import {
  addToCart,
  updateCartQuantity,
  removeFromCart,
  clearCart,
  getCart,
} from "../controllers/cartController.js";
import { verifyJWT } from "../middlewares/authMiddleware.js";

const router = Router();

// Protect all cart routes
router.use(verifyJWT);

router.get("/", getCart);
router.post("/add", addToCart);
router.put("/quantity", updateCartQuantity);
router.post("/remove", removeFromCart);
router.post("/clear", clearCart);

export default router;
