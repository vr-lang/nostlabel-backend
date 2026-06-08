import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import cloudinary from "../config/cloudinary.js";

// POST /api/upload/image
const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "Please upload an image file");
  }

  // Upload memory buffer directly to Cloudinary folder 'nostlabel/products'
  const uploadFromBuffer = (fileBuffer) => {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "nostlabel/products",
          resource_type: "auto",
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        }
      );
      stream.end(fileBuffer);
    });
  };

  try {
    const result = await uploadFromBuffer(req.file.buffer);
    if (!result) {
      throw new ApiError(500, "Cloudinary upload failed");
    }

    return res.status(200).json({
      success: true,
      url: result.secure_url,
      public_id: result.public_id,
    });
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw new ApiError(500, error.message || "Failed to upload image to Cloudinary");
  }
});

// DELETE /api/upload/:publicId
const deleteImage = asyncHandler(async (req, res) => {
  const { publicId } = req.params;

  if (!publicId) {
    throw new ApiError(400, "Please provide a public ID");
  }

  try {
    const response = await cloudinary.uploader.destroy(publicId);
    
    if (response.result !== "ok" && response.result !== "not found") {
      throw new ApiError(500, `Cloudinary deletion returned: ${response.result}`);
    }

    return res.status(200).json(
      new ApiResponse(200, response, "Image deleted successfully from Cloudinary")
    );
  } catch (error) {
    console.error("Cloudinary delete error:", error);
    throw new ApiError(500, error.message || "Failed to delete image from Cloudinary");
  }
});

// GET /api/upload/cloudinary-test
const testCloudinary = asyncHandler(async (req, res) => {
  const sampleBase64Image = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
  try {
    const result = await cloudinary.uploader.upload(sampleBase64Image, {
      folder: "nostlabel/products",
    });

    return res.status(200).json({
      success: true,
      url: result.secure_url,
      public_id: result.public_id,
    });
  } catch (error) {
    console.error("Cloudinary test upload error:", error);
    throw new ApiError(500, error.message || "Cloudinary test upload failed");
  }
});

export { uploadImage, deleteImage, testCloudinary };
