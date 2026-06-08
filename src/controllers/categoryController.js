import Category from "../models/Category.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary, deleteFromCloudinary, getPublicIdFromUrl } from "../services/cloudinaryService.js";

const slugify = (text) =>
  text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");

const createCategory = asyncHandler(async (req, res) => {
  const { name, description, status } = req.body;

  const existedCategory = await Category.findOne({ name });
  if (existedCategory) {
    throw new ApiError(409, "Category with this name already exists");
  }

  const slug = slugify(name);

  let imageUrl = "";
  if (req.file) {
    const uploadResult = await uploadOnCloudinary(req.file.path, "categories");
    if (uploadResult) {
      imageUrl = uploadResult.secure_url;
    }
  }

  const category = await Category.create({
    name,
    slug,
    description,
    image: imageUrl,
    status: status || "ACTIVE",
  });

  return res
    .status(201)
    .json(new ApiResponse(201, category, "Category created successfully"));
});

const updateCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const category = await Category.findById(id);

  if (!category) {
    throw new ApiError(404, "Category not found");
  }

  const updateFields = { ...req.body };

  if (req.body.name) {
    updateFields.slug = slugify(req.body.name);
  }

  if (req.file) {
    // Delete old image if existed
    if (category.image) {
      const publicId = getPublicIdFromUrl(category.image);
      if (publicId) {
        await deleteFromCloudinary(publicId);
      }
    }
    
    // Upload new image
    const uploadResult = await uploadOnCloudinary(req.file.path, "categories");
    if (uploadResult) {
      updateFields.image = uploadResult.secure_url;
    }
  }

  const updatedCategory = await Category.findByIdAndUpdate(
    id,
    { $set: updateFields },
    { new: true, runValidators: true }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, updatedCategory, "Category updated successfully"));
});

const deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const category = await Category.findById(id);

  if (!category) {
    throw new ApiError(404, "Category not found");
  }

  // Delete image from Cloudinary
  if (category.image) {
    const publicId = getPublicIdFromUrl(category.image);
    if (publicId) {
      await deleteFromCloudinary(publicId);
    }
  }

  await Category.findByIdAndDelete(id);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Category deleted successfully"));
});

const getCategories = asyncHandler(async (req, res) => {
  const filter = {};
  
  // Customers only see active categories
  if (!req.user || req.user.role !== "ADMIN") {
    filter.status = "ACTIVE";
  }

  const categories = await Category.find(filter).sort({ name: 1 });

  return res
    .status(200)
    .json(new ApiResponse(200, categories, "Categories fetched successfully"));
});

const getCategoryBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const category = await Category.findOne({ slug });

  if (!category) {
    throw new ApiError(404, "Category not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, category, "Category retrieved successfully"));
});

export {
  createCategory,
  updateCategory,
  deleteCategory,
  getCategories,
  getCategoryBySlug,
};
