import Product from "../models/Product.js";
import Category from "../models/Category.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getPaginationData } from "../utils/pagination.js";
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

const createProduct = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    brand,
    category,
    price,
    discountPrice,
    sizes,
    colors,
    featured,
    bestseller,
    newArrival,
    seoTitle,
    seoDescription,
    status,
    variants,
    images,
  } = req.body;

  // Validate category existence
  const categoryExists = await Category.findById(category);
  if (!categoryExists) {
    throw new ApiError(404, "Target category not found");
  }

  // Generate slug
  const slug = `${slugify(name)}-${Date.now()}`;

  // Parse images if provided as JSON string
  let parsedImages = images;
  if (typeof images === "string") {
    try {
      parsedImages = JSON.parse(images);
    } catch (e) {
      throw new ApiError(400, "Images must be a valid JSON string");
    }
  }

  // Parse variants if provided as stringified JSON (common in multipart-form uploads)
  let parsedVariants = variants;
  if (typeof variants === "string") {
    try {
      parsedVariants = JSON.parse(variants);
    } catch (e) {
      throw new ApiError(400, "Variants must be a valid JSON string");
    }
  }

  // Parse sizes and colors if sent as stringified JSON/arrays
  let parsedSizes = sizes;
  if (typeof sizes === "string") {
    try {
      parsedSizes = JSON.parse(sizes);
    } catch (e) {
      parsedSizes = sizes.split(",").map(s => s.trim());
    }
  }
  let parsedColors = colors;
  if (typeof colors === "string") {
    try {
      parsedColors = JSON.parse(colors);
    } catch (e) {
      parsedColors = colors.split(",").map(c => c.trim());
    }
  }

  const product = await Product.create({
    name,
    slug,
    description,
    brand: brand || "Nostlable",
    category,
    price,
    discountPrice,
    sizes: parsedSizes || [],
    colors: parsedColors || [],
    images: parsedImages || [],
    featured: featured === "true" || featured === true,
    bestseller: bestseller === "true" || bestseller === true,
    newArrival: newArrival === "true" || newArrival === true,
    seoTitle: seoTitle || name,
    seoDescription: seoDescription || description.slice(0, 150),
    status: status || "ACTIVE",
    variants: parsedVariants || [],
  });

  return res
    .status(201)
    .json(new ApiResponse(201, product, "Product created successfully"));
});

const updateProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const product = await Product.findById(id);

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  const updateFields = { ...req.body };

  // Generate slug if name is updated
  if (req.body.name) {
    updateFields.slug = `${slugify(req.body.name)}-${Date.now()}`;
  }

  // Handle category update validation
  if (req.body.category) {
    const categoryExists = await Category.findById(req.body.category);
    if (!categoryExists) {
      throw new ApiError(404, "Target category not found");
    }
  }

  // Parsing JSON payloads
  if (typeof updateFields.images === "string") {
    try {
      updateFields.images = JSON.parse(updateFields.images);
    } catch (e) {
      throw new ApiError(400, "Images must be a valid JSON array");
    }
  }
  if (typeof updateFields.variants === "string") {
    updateFields.variants = JSON.parse(updateFields.variants);
  }
  if (typeof updateFields.sizes === "string") {
    try {
      updateFields.sizes = JSON.parse(updateFields.sizes);
    } catch (e) {
      updateFields.sizes = updateFields.sizes.split(",").map(s => s.trim());
    }
  }
  if (typeof updateFields.colors === "string") {
    try {
      updateFields.colors = JSON.parse(updateFields.colors);
    } catch (e) {
      updateFields.colors = updateFields.colors.split(",").map(c => c.trim());
    }
  }

  // Boolean conversion from string form values
  if (req.body.featured !== undefined) updateFields.featured = req.body.featured === "true" || req.body.featured === true;
  if (req.body.bestseller !== undefined) updateFields.bestseller = req.body.bestseller === "true" || req.body.bestseller === true;
  if (req.body.newArrival !== undefined) updateFields.newArrival = req.body.newArrival === "true" || req.body.newArrival === true;

  // Update product fields (using save() to trigger stock updates pre-save hook)
  Object.keys(updateFields).forEach((key) => {
    if (updateFields[key] !== undefined) {
      product[key] = updateFields[key];
    }
  });

  const updatedProduct = await product.save();

  return res
    .status(200)
    .json(new ApiResponse(200, updatedProduct, "Product updated successfully"));
});

const deleteProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const product = await Product.findById(id);

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  // Delete images from Cloudinary using stored public_id
  if (product.images && product.images.length > 0) {
    for (const img of product.images) {
      if (img && img.public_id) {
        await deleteFromCloudinary(img.public_id);
      } else if (img && img.url) {
        const publicId = getPublicIdFromUrl(img.url);
        if (publicId) {
          await deleteFromCloudinary(publicId);
        }
      }
    }
  }

  await Product.findByIdAndDelete(id);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Product deleted successfully"));
});

const getProductBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const product = await Product.findOne({ slug }).populate("category", "name slug");

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, product, "Product retrieved successfully"));
});

const getProductById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const product = await Product.findById(id).populate("category", "name slug");

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, product, "Product retrieved successfully"));
});

// Advanced Product Search & Pagination
const getAllProducts = asyncHandler(async (req, res) => {
  const {
    keyword,
    category,
    size,
    color,
    priceMin,
    priceMax,
    sortBy,
    page = 1,
    limit = 10,
  } = req.query;

  const mongoQuery = {};

  // Text search on keyword
  if (keyword) {
    mongoQuery.$or = [
      { name: { $regex: keyword, $options: "i" } },
      { description: { $regex: keyword, $options: "i" } },
      { brand: { $regex: keyword, $options: "i" } },
    ];
  }

  // Category filter
  if (category) {
    mongoQuery.category = category;
  }

  // Size filter
  if (size) {
    mongoQuery.sizes = size;
  }

  // Color filter
  if (color) {
    mongoQuery.colors = { $regex: color, $options: "i" };
  }

  // Price range filters
  if (priceMin || priceMax) {
    mongoQuery.price = {};
    if (priceMin) {
      mongoQuery.price.$gte = parseFloat(priceMin);
    }
    if (priceMax) {
      mongoQuery.price.$lte = parseFloat(priceMax);
    }
  }

  // Active status by default unless Admin asks for something else
  if (!req.user || req.user.role !== "ADMIN") {
    mongoQuery.status = "ACTIVE";
  } else if (req.query.status) {
    mongoQuery.status = req.query.status;
  }

  // Count items for pagination metadata
  const totalItems = await Product.countDocuments(mongoQuery);
  const paginationMeta = getPaginationData(totalItems, page, limit);

  // Sorting
  let sortOption = { createdAt: -1 }; // latest default
  if (sortBy) {
    switch (sortBy) {
      case "latest":
        sortOption = { createdAt: -1 };
        break;
      case "priceLowToHigh":
        sortOption = { price: 1 };
        break;
      case "priceHighToLow":
        sortOption = { price: -1 };
        break;
      case "bestSelling":
        sortOption = { bestseller: -1, rating: -1 };
        break;
      case "highestRated":
        sortOption = { rating: -1 };
        break;
      default:
        sortOption = { createdAt: -1 };
    }
  }

  const products = await Product.find(mongoQuery)
    .populate("category", "name slug")
    .sort(sortOption)
    .skip((paginationMeta.currentPage - 1) * paginationMeta.limit)
    .limit(paginationMeta.limit);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        products,
        pagination: {
          totalItems: paginationMeta.totalItems,
          totalPages: paginationMeta.totalPages,
          currentPage: paginationMeta.currentPage,
          hasNextPage: paginationMeta.hasNextPage,
          hasPreviousPage: paginationMeta.hasPreviousPage,
        },
      },
      "Products fetched successfully"
    )
  );
});

export {
  createProduct,
  updateProduct,
  deleteProduct,
  getProductBySlug,
  getProductById,
  getAllProducts,
};
