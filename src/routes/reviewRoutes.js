import { Router } from "express";
import {
  addReview,
  updateReview,
  deleteReview,
  getProductReviews,
} from "../controllers/reviewController.js";
import { verifyJWT } from "../middlewares/authMiddleware.js";
import { reviewCreateValidator, reviewUpdateValidator } from "../validators/reviewValidator.js";

const router = Router();

// Public: Get all reviews for a product
router.get("/product/:productId", getProductReviews);

// Protected: Write, edit, or remove review
router.post("/", verifyJWT, reviewCreateValidator, addReview);
router.put("/:id", verifyJWT, reviewUpdateValidator, updateReview);
router.delete("/:id", verifyJWT, deleteReview);

export default router;
