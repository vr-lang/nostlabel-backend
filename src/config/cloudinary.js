import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (!cloudName || cloudName.trim() === "" || cloudName.includes("your_cloudinary")) {
  throw new Error("Cloudinary Cloud Name Missing");
}

if (!apiKey || apiKey.trim() === "" || apiKey.includes("your_cloudinary")) {
  throw new Error("Cloudinary API Key Missing");
}

if (!apiSecret || apiSecret.trim() === "" || apiSecret.includes("your_cloudinary")) {
  throw new Error("Cloudinary API Secret Missing");
}

cloudinary.config({
  cloud_name: cloudName.trim(),
  api_key: apiKey.trim(),
  api_secret: apiSecret.trim(),
});

export default cloudinary;
