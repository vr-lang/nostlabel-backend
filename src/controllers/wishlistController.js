import User from "../models/User.js";
import Product from "../models/Product.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const addToWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.body;

  const product = await Product.findById(productId);
  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  const user = await User.findById(req.user._id);

  if (user.wishlist.includes(productId)) {
    return res
      .status(200)
      .json(new ApiResponse(200, user.wishlist, "Product is already in wishlist"));
  }

  user.wishlist.push(productId);
  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, user.wishlist, "Product added to wishlist successfully"));
});

const removeFromWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const user = await User.findById(req.user._id);

  user.wishlist = user.wishlist.filter((id) => id.toString() !== productId);
  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, user.wishlist, "Product removed from wishlist successfully"));
});

const getWishlist = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate(
    "wishlist",
    "name slug brand price discountPrice images status stock rating reviewCount"
  );

  return res
    .status(200)
    .json(new ApiResponse(200, user.wishlist, "Wishlist items fetched successfully"));
});

export { addToWishlist, removeFromWishlist, getWishlist };
