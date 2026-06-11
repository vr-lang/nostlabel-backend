import Review from "../models/Review.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const addReview = asyncHandler(async (req, res) => {
  const { product, rating, comment } = req.body;

  // 1. Verify product exists
  const targetProduct = await Product.findById(product);
  if (!targetProduct) {
    throw new ApiError(404, "Product not found");
  }

  // 2. Check if user already reviewed this product
  const existingReview = await Review.findOne({ product, user: req.user._id });
  if (existingReview) {
    throw new ApiError(400, "You have already reviewed this product. Please update your existing review instead.");
  }

  // 3. Premium feature: Verify customer has purchased and received the item
  const hasPurchased = await Order.findOne({
    customer: req.user._id,
    orderStatus: "DELIVERED",
    "items.product": product,
  });

  if (!hasPurchased) {
    throw new ApiError(403, "You can only review products that you have purchased and received.");
  }

  const review = await Review.create({
    product,
    user: req.user._id,
    rating,
    comment,
  });

  // Re-fetch populated review
  const populatedReview = await Review.findById(review._id).populate("user", "name profileImage");

  return res
    .status(201)
    .json(new ApiResponse(201, populatedReview, "Review added successfully"));
});

const updateReview = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rating, comment } = req.body;

  const review = await Review.findById(id);
  if (!review) {
    throw new ApiError(404, "Review not found");
  }

  if (review.user.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Forbidden: You cannot update another user's review");
  }

  if (rating) review.rating = rating;
  if (comment) review.comment = comment;

  // Save triggers the calculateAverageRating pre-save hooks on Review model
  await review.save();

  const updatedReview = await Review.findById(id).populate("user", "name profileImage");

  return res
    .status(200)
    .json(new ApiResponse(200, updatedReview, "Review updated successfully"));
});

const deleteReview = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const review = await Review.findById(id);
  if (!review) {
    throw new ApiError(404, "Review not found");
  }

  if (req.user.role !== "ADMIN" && review.user.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Forbidden: You cannot delete this review");
  }

  // findByIdAndDelete triggers the post review deletion rating hook
  await Review.findByIdAndDelete(id);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Review deleted successfully"));
});

const getProductReviews = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const reviews = await Review.find({ product: productId })
    .populate("user", "name profileImage")
    .sort({ createdAt: -1 });

  // Calculate stats block
  const totalReviews = reviews.length;
  let sumRating = 0;
  const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  
  reviews.forEach(r => {
    sumRating += r.rating;
    if (breakdown[r.rating] !== undefined) {
      breakdown[r.rating]++;
    }
  });

  const averageRating = totalReviews > 0 ? Math.round((sumRating / totalReviews) * 10) / 10 : 0;

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {
          reviews,
          stats: {
            averageRating,
            reviewCount: totalReviews,
            breakdown,
          },
        },
        "Product reviews fetched successfully"
      )
    );
});

const checkCanReview = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const userId = req.user._id;

  // 1. Verify product exists
  const targetProduct = await Product.findById(productId);
  if (!targetProduct) {
    return res
      .status(200)
      .json(new ApiResponse(200, { canReview: false, reason: "Product not found" }, "Product not found"));
  }

  // 2. Check if user already reviewed this product
  const existingReview = await Review.findOne({ product: productId, user: userId });
  if (existingReview) {
    return res
      .status(200)
      .json(new ApiResponse(200, { canReview: false, reason: "You have already reviewed this product." }, "Already reviewed"));
  }

  // 3. Verify customer has purchased and received the item
  const hasPurchased = await Order.findOne({
    customer: userId,
    orderStatus: "DELIVERED",
    "items.product": productId,
  });

  if (!hasPurchased) {
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { canReview: false, reason: "You can only review products that you have purchased and received." },
          "Not purchased"
        )
      );
  }

  return res.status(200).json(new ApiResponse(200, { canReview: true }, "Eligible to review"));
});

const getAllReviewsAdmin = asyncHandler(async (req, res) => {
  const reviews = await Review.find()
    .populate("user", "name email profileImage")
    .populate("product", "name slug images")
    .sort({ createdAt: -1 });

  return res
    .status(200)
    .json(new ApiResponse(200, reviews, "All reviews fetched successfully for admin"));
});

export {
  addReview,
  updateReview,
  deleteReview,
  getProductReviews,
  checkCanReview,
  getAllReviewsAdmin,
};
