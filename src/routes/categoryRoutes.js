import { Router } from "express";
import {
  createCategory,
  updateCategory,
  deleteCategory,
  getCategories,
  getCategoryBySlug,
} from "../controllers/categoryController.js";
import { verifyJWT, optionalVerifyJWT, isAdmin } from "../middlewares/authMiddleware.js";
import { upload } from "../middlewares/uploadMiddleware.js";
import { categoryCreateValidator, categoryUpdateValidator } from "../validators/categoryValidator.js";

const router = Router();

// Public routes
router.get("/", optionalVerifyJWT, getCategories);
router.get("/slug/:slug", getCategoryBySlug);

// Admin-only category routes
router.post(
  "/",
  verifyJWT,
  isAdmin,
  upload.single("image"),
  categoryCreateValidator,
  createCategory
);

router.put(
  "/:id",
  verifyJWT,
  isAdmin,
  upload.single("image"),
  categoryUpdateValidator,
  updateCategory
);

router.delete("/:id", verifyJWT, isAdmin, deleteCategory);

export default router;
