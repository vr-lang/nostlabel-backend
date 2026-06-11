import { Router } from "express";
import {
  createOffer,
  updateOffer,
  deleteOffer,
  getOffers,
  getActiveOffers,
} from "../controllers/offerController.js";
import { verifyJWT, isAdmin } from "../middlewares/authMiddleware.js";

const router = Router();

// Public route to fetch current running promotions for storefront top bar
router.get("/active", getActiveOffers);

// Admin-only endpoints for offer setup, updates, and deletes
router.get("/", verifyJWT, isAdmin, getOffers);
router.post("/", verifyJWT, isAdmin, createOffer);
router.put("/:id", verifyJWT, isAdmin, updateOffer);
router.delete("/:id", verifyJWT, isAdmin, deleteOffer);

export default router;
