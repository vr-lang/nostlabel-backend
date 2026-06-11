import User from "../models/User.js";
import Product from "../models/Product.js";
import Offer from "../models/Offer.js";
import { calculateOfferDiscount } from "./offerController.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Helper to compute cart totals dynamically with active offers
const getCartTotals = async (cartItems) => {
  let subtotal = 0;
  let mrpDiscount = 0;

  cartItems.forEach((item) => {
    subtotal += item.price * item.quantity;
    if (item.product && item.product.discountPrice) {
      mrpDiscount += (item.product.price - item.product.discountPrice) * item.quantity;
    }
  });

  const now = new Date();
  const activeOffers = await Offer.find({
    isActive: true,
    startDate: { $lte: now },
    endDate: { $gte: now },
  }).sort({ priority: -1 });

  let offerDiscountAmount = 0;
  let appliedOffer = null;

  for (const offer of activeOffers) {
    const offerRes = calculateOfferDiscount(cartItems, offer);
    if (offerRes.discountAmount > offerDiscountAmount) {
      offerDiscountAmount = offerRes.discountAmount;
      appliedOffer = offerRes.appliedOffer;
    }
  }

  return {
    subtotal,
    discount: mrpDiscount,
    offerDiscount: offerDiscountAmount,
    offerName: appliedOffer ? appliedOffer.title : null,
    total: Math.round((subtotal - offerDiscountAmount) * 100) / 100,
  };
};

// Helper for populating cart
const populateCartOptions = {
  path: "cart.product",
  select: "name images price discountPrice status stock variants category",
  populate: {
    path: "category",
    select: "name slug"
  }
};

const addToCart = asyncHandler(async (req, res) => {
  const { productId, size, color, quantity = 1 } = req.body;

  const product = await Product.findById(productId);
  if (!product || product.status !== "ACTIVE") {
    throw new ApiError(404, "Product is not available");
  }

  const variant = product.variants.find(
    (v) => v.size === size && v.color.toLowerCase() === color.toLowerCase()
  );

  if (!variant) {
    throw new ApiError(404, `Selected variant (Size: ${size}, Color: ${color}) does not exist`);
  }

  if (variant.stock < quantity) {
    throw new ApiError(400, `Insufficient stock. Only ${variant.stock} item(s) left.`);
  }

  const user = await User.findById(req.user._id);

  const cartItemIndex = user.cart.findIndex(
    (item) =>
      item.product.toString() === productId &&
      item.size === size &&
      item.color.toLowerCase() === color.toLowerCase()
  );

  const price = product.discountPrice || product.price;

  if (cartItemIndex > -1) {
    const newQty = user.cart[cartItemIndex].quantity + quantity;
    if (variant.stock < newQty) {
      throw new ApiError(400, `Cannot update cart. Total requested (${newQty}) exceeds available stock (${variant.stock}).`);
    }
    user.cart[cartItemIndex].quantity = newQty;
    user.cart[cartItemIndex].price = price;
  } else {
    user.cart.push({
      product: productId,
      size,
      color,
      quantity,
      price,
    });
  }

  await user.save();

  const populatedUser = await User.findById(req.user._id).populate(populateCartOptions);
  const totals = await getCartTotals(populatedUser.cart);

  return res.status(200).json(
    new ApiResponse(
      200,
      { cart: populatedUser.cart, ...totals },
      "Product added to cart successfully"
    )
  );
});

const updateCartQuantity = asyncHandler(async (req, res) => {
  const { productId, size, color, quantity } = req.body;

  if (quantity < 1) {
    throw new ApiError(400, "Quantity must be at least 1");
  }

  const product = await Product.findById(productId);
  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  const variant = product.variants.find(
    (v) => v.size === size && v.color.toLowerCase() === color.toLowerCase()
  );

  if (!variant) {
    throw new ApiError(404, "Product variant not found");
  }

  if (variant.stock < quantity) {
    throw new ApiError(400, `Insufficient stock. Only ${variant.stock} item(s) left.`);
  }

  const user = await User.findById(req.user._id);

  const cartItemIndex = user.cart.findIndex(
    (item) =>
      item.product.toString() === productId &&
      item.size === size &&
      item.color.toLowerCase() === color.toLowerCase()
  );

  if (cartItemIndex === -1) {
    throw new ApiError(404, "Item not found in cart");
  }

  user.cart[cartItemIndex].quantity = quantity;
  user.cart[cartItemIndex].price = product.discountPrice || product.price;
  await user.save();

  const populatedUser = await User.findById(req.user._id).populate(populateCartOptions);
  const totals = await getCartTotals(populatedUser.cart);

  return res.status(200).json(
    new ApiResponse(
      200,
      { cart: populatedUser.cart, ...totals },
      "Cart quantity updated successfully"
    )
  );
});

const removeFromCart = asyncHandler(async (req, res) => {
  const { productId, size, color } = req.body;

  const user = await User.findById(req.user._id);

  user.cart = user.cart.filter(
    (item) =>
      !(
        item.product.toString() === productId &&
        item.size === size &&
        item.color.toLowerCase() === color.toLowerCase()
      )
  );

  await user.save();

  const populatedUser = await User.findById(req.user._id).populate(populateCartOptions);
  const totals = await getCartTotals(populatedUser.cart);

  return res.status(200).json(
    new ApiResponse(
      200,
      { cart: populatedUser.cart, ...totals },
      "Item removed from cart successfully"
    )
  );
});

const clearCart = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  user.cart = [];
  await user.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      { cart: [], subtotal: 0, discount: 0, offerDiscount: 0, offerName: null, total: 0 },
      "Cart cleared successfully"
    )
  );
});

const getCart = asyncHandler(async (req, res) => {
  if (!req.user) {
    return res.status(200).json(
      new ApiResponse(
        200,
        { cart: [], subtotal: 0, discount: 0, offerDiscount: 0, offerName: null, total: 0 },
        "Guest cart details fetched successfully"
      )
    );
  }

  const user = await User.findById(req.user._id).populate(populateCartOptions);
  
  let isModified = false;
  
  for (let i = 0; i < user.cart.length; i++) {
    const item = user.cart[i];
    if (!item.product) {
      user.cart.splice(i, 1);
      i--;
      isModified = true;
      continue;
    }
    
    const latestPrice = item.product.discountPrice || item.product.price;
    if (item.price !== latestPrice) {
      item.price = latestPrice;
      isModified = true;
    }
  }

  if (isModified) {
    await user.save();
  }

  const totals = await getCartTotals(user.cart);

  return res.status(200).json(
    new ApiResponse(
      200,
      { cart: user.cart, ...totals },
      "Cart details fetched successfully"
    )
  );
});

export { addToCart, updateCartQuantity, removeFromCart, clearCart, getCart };
