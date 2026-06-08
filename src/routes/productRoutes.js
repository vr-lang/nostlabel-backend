import { Router } from "express";
import {
  createProduct,
  updateProduct,
  deleteProduct,
  getProductBySlug,
  getProductById,
  getAllProducts,
} from "../controllers/productController.js";
import { verifyJWT, optionalVerifyJWT, isAdmin } from "../middlewares/authMiddleware.js";
import { upload } from "../middlewares/uploadMiddleware.js";
import { productCreateValidator, productUpdateValidator } from "../validators/productValidator.js";

const router = Router();

// Public routes (Guests can view, optionalVerifyJWT lets logged-in admins see unpublished/drafts)
router.get("/", optionalVerifyJWT, getAllProducts);
router.get("/slug/:slug", getProductBySlug);
router.get("/:id", getProductById);

const parseMultipartFields = (req, res, next) => {
  if (req.body.variants && typeof req.body.variants === "string") {
    try { req.body.variants = JSON.parse(req.body.variants); } catch (e) {}
  }
  if (req.body.sizes && typeof req.body.sizes === "string") {
    try { req.body.sizes = JSON.parse(req.body.sizes); } catch (e) {
      req.body.sizes = req.body.sizes.split(",").map(s => s.trim());
    }
  }
  if (req.body.colors && typeof req.body.colors === "string") {
    try { req.body.colors = JSON.parse(req.body.colors); } catch (e) {
      req.body.colors = req.body.colors.split(",").map(c => c.trim());
    }
  }
  next();
};

// Admin-only product management routes
router.post(
  "/",
  verifyJWT,
  isAdmin,
  productCreateValidator,
  createProduct
);

router.put(
  "/:id",
  verifyJWT,
  isAdmin,
  productUpdateValidator,
  updateProduct
);

router.delete("/:id", verifyJWT, isAdmin, deleteProduct);

export default router;
