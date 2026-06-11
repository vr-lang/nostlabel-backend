import { Router } from "express";
import {
  getHomepageOffer,
  updateHomepageOffer,
} from "../controllers/homepageOfferController.js";
import { verifyJWT, isAdmin } from "../middlewares/authMiddleware.js";

const router = Router();

// Public route to fetch the homepage offer details
router.get("/", getHomepageOffer);

// Admin-only endpoint to update the homepage offer configuration
router.put("/", verifyJWT, isAdmin, updateHomepageOffer);

export default router;
