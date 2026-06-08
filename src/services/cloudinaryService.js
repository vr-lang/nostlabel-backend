import cloudinary from "../config/cloudinary.js";
import fs from "fs";

const uploadOnCloudinary = async (localFilePath, folderName = "nostlable") => {
  try {
    if (!localFilePath) return null;
    
    // Upload the file on cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
      folder: folderName,
    });

    // File has been uploaded successfully, remove from local storage
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
    
    return response;
  } catch (error) {
    // Remove the locally saved temporary file as the upload operation failed
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
    console.error("Cloudinary upload error: ", error.message);
    return null;
  }
};

const deleteFromCloudinary = async (publicId) => {
  try {
    if (!publicId) return null;
    const response = await cloudinary.uploader.destroy(publicId);
    return response;
  } catch (error) {
    console.error("Cloudinary delete error: ", error.message);
    return null;
  }
};

/**
 * Extracts publicId from a full Cloudinary URL
 * Example URL: https://res.cloudinary.com/demo/image/upload/v1570975253/nostlable/tshirt_abc.png
 */
const getPublicIdFromUrl = (url) => {
  try {
    if (!url) return "";
    const parts = url.split("/");
    const filenameWithExtension = parts.pop();
    const folder = parts.pop(); // e.g. "nostlable"
    const publicId = filenameWithExtension.split(".")[0];
    return folder ? `${folder}/${publicId}` : publicId;
  } catch (error) {
    console.error("Extract public ID from URL error: ", error.message);
    return "";
  }
};

export { uploadOnCloudinary, deleteFromCloudinary, getPublicIdFromUrl };
