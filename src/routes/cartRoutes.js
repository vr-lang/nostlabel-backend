import { Router } from "express";
import {
  addToCart,
  updateCartQuantity,
  removeFromCart,
  clearCart,
  getCart,
} from "../controllers/cartController.js";
import { verifyJWT, optionalVerifyJWT } from "../middlewares/authMiddleware.js";

const router = Router();

// Allow guests to fetch an empty cart, but require verification for modifications
router.get("/", optionalVerifyJWT, getCart);

// Protect modifying cart routes
router.use(verifyJWT);

router.post("/add", addToCart);
router.put("/quantity", updateCartQuantity);
router.post("/remove", removeFromCart);
router.post("/clear", clearCart);

export default router;
