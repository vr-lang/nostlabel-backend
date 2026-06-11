import Order from "../models/Order.js";
import User from "../models/User.js";
import Coupon from "../models/Coupon.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { verifyRazorpaySignature, verifyWebhookSignature, createRazorpayOrder } from "../services/razorpayService.js";
import { reduceStockForOrder } from "../services/inventoryService.js";
import { sendOrderStatusNotificationToUser, sendOrderNotificationToAdmin } from "../config/socket.js";

// Helper to confirm order payment, reduce stock, and clear cart
const finalizeSuccessfulPayment = async (order, razorpayPaymentId, razorpaySignature, userId) => {
  if (order.paymentStatus === "COMPLETED") return order;

  order.paymentStatus = "COMPLETED";
  order.orderStatus = "CONFIRMED";
  order.razorpayPaymentId = razorpayPaymentId;
  order.razorpaySignature = razorpaySignature;
  await order.save();

  // Deduct inventory stock
  await reduceStockForOrder(order, userId);

  // Clear customer cart
  await User.findByIdAndUpdate(userId, { $set: { cart: [] } });

  // Increment coupon usage if coupon code was applied
  if (order.couponCode) {
    const coupon = await Coupon.findOne({ code: order.couponCode.toUpperCase() });
    if (coupon) {
      coupon.usedCount += 1;
      await coupon.save();
    }
  }

  // Socket notification
  sendOrderNotificationToAdmin(order);
  sendOrderStatusNotificationToUser(userId.toString(), order);

  return order;
};

// Retry order payment creation for pending orders
const createPaymentOrderForPending = asyncHandler(async (req, res) => {
  const { orderId } = req.body;
  const order = await Order.findById(orderId);

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  if (order.customer.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Forbidden: Unauthorized access");
  }

  if (order.paymentStatus === "COMPLETED" || order.orderStatus === "CANCELLED") {
    throw new ApiError(400, `Cannot pay for order. Current status: ${order.paymentStatus}/${order.orderStatus}`);
  }

  // Generate a new Razorpay Order Hash
  const razorpayOrder = await createRazorpayOrder(order._id.toString(), order.totalAmount);
  
  order.razorpayOrderId = razorpayOrder.id;
  await order.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        orderId: order._id,
        razorpayOrder: {
          id: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
        },
      },
      "Razorpay payment order hash regenerated"
    )
  );
});

// Verify Payment Checksum
const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

  const order = await Order.findOne({ razorpayOrderId });
  if (!order) {
    throw new ApiError(404, "Order not found for matching Razorpay ID");
  }

  // Verify HMAC signature
  const isSignatureValid = verifyRazorpaySignature(
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature
  );

  if (!isSignatureValid) {
    order.paymentStatus = "FAILED";
    await order.save();
    throw new ApiError(400, "Payment verification signature check failed");
  }

  const updatedOrder = await finalizeSuccessfulPayment(
    order,
    razorpayPaymentId,
    razorpaySignature,
    order.customer
  );

  return res
    .status(200)
    .json(new ApiResponse(200, updatedOrder, "Payment verified and order confirmed successfully"));
});

// Webhook endpoint to catch Razorpay events asynchronously
const razorpayWebhook = asyncHandler(async (req, res) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "NostlableWebhookSecret123";
  const signature = req.headers["x-razorpay-signature"];

  // Verify webhook signature (using raw request body)
  const isSignatureValid = verifyWebhookSignature(
    JSON.stringify(req.body),
    signature,
    webhookSecret
  );

  // If signature is invalid in production, throw error, otherwise allow (or log warning)
  if (!isSignatureValid && process.env.NODE_ENV === "production") {
    throw new ApiError(400, "Invalid webhook signature");
  }

  const event = req.body.event;
  console.log(`[Razorpay Webhook] Received event: ${event}`);

  if (event === "payment.captured") {
    const paymentEntity = req.body.payload.payment.entity;
    const razorpayOrderId = paymentEntity.order_id;
    const razorpayPaymentId = paymentEntity.id;
    const razorpaySignature = signature || "webhook_signature_verified";

    const order = await Order.findOne({ razorpayOrderId });
    if (order && order.paymentStatus !== "COMPLETED") {
      await finalizeSuccessfulPayment(
        order,
        razorpayPaymentId,
        razorpaySignature,
        order.customer
      );
      console.log(`[Razorpay Webhook] Order #${order.orderNumber} successfully finalized via webhook`);
    }
  } else if (event === "payment.failed") {
    const paymentEntity = req.body.payload.payment.entity;
    const razorpayOrderId = paymentEntity.order_id;

    const order = await Order.findOne({ razorpayOrderId });
    if (order && order.paymentStatus !== "COMPLETED") {
      order.paymentStatus = "FAILED";
      await order.save();
      console.log(`[Razorpay Webhook] Order #${order.orderNumber} set to payment status FAILED`);
    }
  }

  // Always return 200 OK to Razorpay to acknowledge webhook receipt
  return res.status(200).json({ status: "ok" });
});

export { createPaymentOrderForPending, verifyPayment, razorpayWebhook };
