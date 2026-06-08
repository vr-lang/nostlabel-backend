import Exchange from "../models/Exchange.js";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import User from "../models/User.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { adjustStock } from "../services/inventoryService.js";
import { sendExchangeStatusEmail } from "../services/emailService.js";

/**
 * @desc    Create a new size exchange request
 * @route   POST /api/exchange
 * @access  Private (Customer)
 */
const createExchange = asyncHandler(async (req, res) => {
  const { orderId, productId, currentSize, requestedSize, reason, notes } = req.body;

  if (!orderId || !productId || !currentSize || !requestedSize || !reason) {
    throw new ApiError(400, "Missing required parameters for size exchange request");
  }

  // 1. Verify order
  const order = await Order.findById(orderId);
  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  if (order.customer.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Forbidden: You are not authorized to request an exchange for this order");
  }

  if (order.orderStatus !== "DELIVERED") {
    throw new ApiError(400, "Size exchanges can only be requested for DELIVERED orders");
  }

  // Verify 7-day exchange window
  const exchangeWindowDays = 7;
  const deliveredDate = new Date(order.updatedAt);
  const timeDifference = Date.now() - deliveredDate.getTime();
  const daysDifference = timeDifference / (1000 * 3600 * 24);

  if (daysDifference > exchangeWindowDays) {
    throw new ApiError(400, `Exchange window expired. Size exchanges are only allowed within ${exchangeWindowDays} days of delivery.`);
  }

  // 2. Find product item in order
  const orderItem = order.items.find(
    (item) => item.product.toString() === productId && item.size === currentSize
  );

  if (!orderItem) {
    throw new ApiError(400, "Item not found in order spec matching product and current size");
  }

  // Check if an exchange has already been requested for this item in this order
  const existingExchange = await Exchange.findOne({
    order: orderId,
    product: productId,
    currentSize,
  });

  if (existingExchange) {
    throw new ApiError(400, "An exchange request has already been filed for this product in this order");
  }

  // 3. Verify requested size exists as a variant on the product
  const product = await Product.findById(productId);
  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  const requestedVariant = product.variants.find(
    (v) => v.size === requestedSize && v.color.toLowerCase() === orderItem.color.toLowerCase()
  );

  if (!requestedVariant) {
    throw new ApiError(400, `Requested size ${requestedSize} variant does not exist for this product.`);
  }

  // Verify stock available for the requested size
  if (requestedVariant.stock < 1) {
    throw new ApiError(400, `Requested size ${requestedSize} is currently out of stock and cannot be selected.`);
  }

  // 4. Create Exchange document
  const exchange = new Exchange({
    customer: req.user._id,
    order: orderId,
    product: productId,
    currentSize,
    requestedSize,
    reason,
    notes,
    status: "EXCHANGE_REQUESTED",
  });

  await exchange.save();

  // 5. Send confirmation email
  try {
    const customerUser = await User.findById(req.user._id);
    if (customerUser && customerUser.email) {
      await sendExchangeStatusEmail(customerUser.email, exchange, order, product);
    }
  } catch (emailErr) {
    console.error("Exchange confirmation email failed to send: ", emailErr);
  }

  // Socket notification to admins
  const io = req.app.get("socketio");
  if (io) {
    io.to("admins").emit("exchange_request", {
      message: `Exchange requested for order #${order.orderNumber}`,
      exchange,
    });
  }

  return res
    .status(201)
    .json(new ApiResponse(201, exchange, "Size exchange request submitted successfully"));
});

/**
 * @desc    Get current customer's exchanges
 * @route   GET /api/exchange/me
 * @access  Private (Customer)
 */
const getMyExchanges = asyncHandler(async (req, res) => {
  const exchanges = await Exchange.find({ customer: req.user._id })
    .populate("product", "name images price")
    .populate("order", "orderNumber")
    .sort({ createdAt: -1 });

  return res
    .status(200)
    .json(new ApiResponse(200, exchanges, "Customer exchanges retrieved successfully"));
});

/**
 * @desc    Get exchange details by ID
 * @route   GET /api/exchange/:id
 * @access  Private (Customer/Admin)
 */
const getExchangeById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const exchange = await Exchange.findById(id)
    .populate("product", "name images price description")
    .populate("order", "orderNumber createdAt")
    .populate("customer", "name email");

  if (!exchange) {
    throw new ApiError(404, "Exchange request not found");
  }

  // Access check
  if (req.user.role !== "ADMIN" && exchange.customer.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Forbidden: You are not authorized to view this record");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, exchange, "Exchange details retrieved successfully"));
});

/**
 * @desc    Get all exchanges (Admin)
 * @route   GET /api/admin/exchanges
 * @access  Private (Admin)
 */
const getAllExchangesAdmin = asyncHandler(async (req, res) => {
  const exchanges = await Exchange.find()
    .populate("customer", "name email phone")
    .populate("product", "name images")
    .populate("order", "orderNumber")
    .sort({ createdAt: -1 });

  return res
    .status(200)
    .json(new ApiResponse(200, exchanges, "All exchanges retrieved successfully"));
});

/**
 * @desc    Update exchange status & trigger logistics/stock adjustments (Admin)
 * @route   PUT /api/admin/exchanges/:id/status
 * @access  Private (Admin)
 */
const updateExchangeStatusAdmin = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, adminFeedback } = req.body;

  if (!status) {
    throw new ApiError(400, "Exchange status is required");
  }

  const exchange = await Exchange.findById(id);
  if (!exchange) {
    throw new ApiError(404, "Exchange request not found");
  }

  const prevStatus = exchange.status;
  if (prevStatus === status) {
    return res
      .status(200)
      .json(new ApiResponse(200, exchange, `Exchange status is already ${status}`));
  }

  const order = await Order.findById(exchange.order);
  if (!order) {
    throw new ApiError(404, "Associated order not found");
  }

  const product = await Product.findById(exchange.product);
  if (!product) {
    throw new ApiError(404, "Associated product not found");
  }

  // Find color of original ordered item to match variant
  const orderItem = order.items.find(
    (item) => item.product.toString() === exchange.product.toString() && item.size === exchange.currentSize
  );
  const color = orderItem ? orderItem.color : product.variants[0]?.color || "black";

  // State trigger adjustments:
  // 1. APPROVING EXCHANGE -> Deduct stock of requestedSize
  if (status === "EXCHANGE_APPROVED" && prevStatus !== "EXCHANGE_APPROVED") {
    // Deduct 1 unit from requested size variant
    await adjustStock(exchange.product, exchange.requestedSize, color, -1, "SALE", req.user._id);
  }

  // 2. PRODUCT RECEIVED -> Restore stock of returned currentSize
  if (status === "PRODUCT_RECEIVED" && prevStatus !== "PRODUCT_RECEIVED") {
    // Add 1 unit back to current size variant
    await adjustStock(exchange.product, exchange.currentSize, color, 1, "RETURN", req.user._id);
  }

  // Save updates
  exchange.status = status;
  if (adminFeedback !== undefined) {
    exchange.adminFeedback = adminFeedback;
  }
  await exchange.save();

  // Send status update email notification on key milestones
  const customerUser = await User.findById(exchange.customer);
  if (customerUser && customerUser.email) {
    try {
      await sendExchangeStatusEmail(customerUser.email, exchange, order, product);
    } catch (emailErr) {
      console.error("Exchange status update email failed to send: ", emailErr);
    }
  }

  // Socket notification
  const io = req.app.get("socketio");
  if (io) {
    io.to(exchange.customer.toString()).emit("exchange_status_update", {
      message: `Your size exchange status has been updated to: ${status.replace('_', ' ')}`,
      exchange,
    });
  }

  return res
    .status(200)
    .json(new ApiResponse(200, exchange, `Exchange status successfully updated to ${status}`));
});

export {
  createExchange,
  getMyExchanges,
  getExchangeById,
  getAllExchangesAdmin,
  updateExchangeStatusAdmin,
};
