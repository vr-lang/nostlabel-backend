import User from "../models/User.js";
import Product from "../models/Product.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Helper to compute cart totals dynamically based on latest DB prices
const calculateCartTotals = (cartItems) => {
  let subtotal = 0;
  let discount = 0;
  let total = 0;

  cartItems.forEach((item) => {
    const itemPrice = item.product.discountPrice || item.product.price;
    subtotal += item.price * item.quantity;
    
    // Track saving difference if product is discounted
    if (item.product.discountPrice) {
      discount += (item.product.price - item.product.discountPrice) * item.quantity;
    }
  });

  total = subtotal; // Shipping / coupon adjustments are done at order checkout level

  return {
    subtotal,
    discount,
    total,
  };
};

const addToCart = asyncHandler(async (req, res) => {
  const { productId, size, color, quantity = 1 } = req.body;

  const product = await Product.findById(productId);
  if (!product || product.status !== "ACTIVE") {
    throw new ApiError(404, "Product is not available");
  }

  // Find variant and check stock
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

  // Check if variant already exists in cart
  const cartItemIndex = user.cart.findIndex(
    (item) =>
      item.product.toString() === productId &&
      item.size === size &&
      item.color.toLowerCase() === color.toLowerCase()
  );

  const price = product.discountPrice || product.price;

  if (cartItemIndex > -1) {
    // Check if updated quantity exceeds stock
    const newQty = user.cart[cartItemIndex].quantity + quantity;
    if (variant.stock < newQty) {
      throw new ApiError(400, `Cannot update cart. Total requested (${newQty}) exceeds available stock (${variant.stock}).`);
    }
    user.cart[cartItemIndex].quantity = newQty;
    user.cart[cartItemIndex].price = price; // sync with current price
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

  // Populate product details for response
  const populatedUser = await User.findById(req.user._id).populate("cart.product", "name images price discountPrice");
  const totals = calculateCartTotals(populatedUser.cart);

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
  user.cart[cartItemIndex].price = product.discountPrice || product.price; // sync with current price
  await user.save();

  const populatedUser = await User.findById(req.user._id).populate("cart.product", "name images price discountPrice");
  const totals = calculateCartTotals(populatedUser.cart);

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

  const populatedUser = await User.findById(req.user._id).populate("cart.product", "name images price discountPrice");
  const totals = calculateCartTotals(populatedUser.cart);

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
      { cart: [], subtotal: 0, discount: 0, total: 0 },
      "Cart cleared successfully"
    )
  );
});

const getCart = asyncHandler(async (req, res) => {
  if (!req.user) {
    return res.status(200).json(
      new ApiResponse(
        200,
        { cart: [], subtotal: 0, discount: 0, total: 0 },
        "Guest cart details fetched successfully"
      )
    );
  }

  const user = await User.findById(req.user._id).populate("cart.product", "name images price discountPrice status stock variants");
  
  // Clean cart items that might have been deleted or stock went zero if necessary
  // Or just sync prices
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

  const totals = calculateCartTotals(user.cart);

  return res.status(200).json(
    new ApiResponse(
      200,
      { cart: user.cart, ...totals },
      "Cart details fetched successfully"
    )
  );
});

export { addToCart, updateCartQuantity, removeFromCart, clearCart, getCart };
