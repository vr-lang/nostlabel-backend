import { Router } from "express";
import { uploadImage, deleteImage, testCloudinary } from "../controllers/uploadController.js";
import { verifyJWT, isAdmin } from "../middlewares/authMiddleware.js";
import { upload } from "../middlewares/uploadMiddleware.js";

const router = Router();

// Only authenticated admin users can upload or delete images
router.post("/image", verifyJWT, isAdmin, upload.single("image"), uploadImage);
router.delete("/:publicId(*)", verifyJWT, isAdmin, deleteImage);

// Authenticated customers can upload profile pictures
router.post("/profile-image", verifyJWT, upload.single("image"), uploadImage);

// Temporary test route to verify Cloudinary configuration
router.get("/cloudinary-test", testCloudinary);

export default router;
