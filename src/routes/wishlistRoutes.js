import { Router } from "express";
import {
  addToWishlist,
  removeFromWishlist,
  getWishlist,
} from "../controllers/wishlistController.js";
import { verifyJWT } from "../middlewares/authMiddleware.js";

const router = Router();

// Protect all wishlist routes
router.use(verifyJWT);

router.get("/", getWishlist);
router.post("/add", addToWishlist);
router.delete("/remove/:productId", removeFromWishlist);

export default router;
