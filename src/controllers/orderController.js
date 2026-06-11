import Order from "../models/Order.js";
import Product from "../models/Product.js";
import User from "../models/User.js";
import Coupon from "../models/Coupon.js";
import Offer from "../models/Offer.js";
import { calculateOfferDiscount } from "./offerController.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getPaginationData } from "../utils/pagination.js";
import { createRazorpayOrder, initiateRefund } from "../services/razorpayService.js";
import { reduceStockForOrder, restoreStockForOrder } from "../services/inventoryService.js";
import { sendOrderNotificationToAdmin, sendOrderStatusNotificationToUser } from "../config/socket.js";
import { sendOrderConfirmationEmail, sendOrderStatusUpdateEmail } from "../services/emailService.js";

const placeOrder = asyncHandler(async (req, res) => {
  const { shippingAddressId, paymentMethod = "RAZORPAY", couponCode, notes } = req.body;

  // 1. Fetch user cart and profile (populating product category for the offer engine)
  const user = await User.findById(req.user._id).populate({
    path: "cart.product",
    populate: { path: "category" }
  });
  if (!user || user.cart.length === 0) {
    throw new ApiError(400, "Your shopping cart is empty");
  }

  // 2. Fetch shipping address from user profile
  const shippingAddressObj = user.addresses.id(shippingAddressId);
  if (!shippingAddressObj) {
    throw new ApiError(404, "Shipping address not found");
  }

  // 3. Verify stock availability for all items in cart
  const orderItems = [];
  let subtotal = 0;

  for (const item of user.cart) {
    const product = item.product;
    if (!product || product.status !== "ACTIVE") {
      throw new ApiError(400, `Product is no longer available: ${product ? product.name : "Unknown Product"}`);
    }

    const variant = product.variants.find(
      (v) => v.size === item.size && v.color.toLowerCase() === item.color.toLowerCase()
    );

    if (!variant || variant.stock < item.quantity) {
      throw new ApiError(
        400,
        `Insufficient stock for product ${product.name} (Size: ${item.size}, Color: ${item.color}). Available: ${variant ? variant.stock : 0}`
      );
    }

    const itemPrice = product.discountPrice || product.price;
    subtotal += itemPrice * item.quantity;

    orderItems.push({
      product: product._id,
      name: product.name,
      size: item.size,
      color: item.color,
      quantity: item.quantity,
      price: itemPrice,
    });
  }

  // Apply offer discount first (Stacking: Offer applies, then coupon applies on remainder)
  const now = new Date();
  const activeOffers = await Offer.find({
    isActive: true,
    startDate: { $lte: now },
    endDate: { $gte: now },
  }).sort({ priority: -1 });

  let offerDiscountAmount = 0;
  let appliedOffer = null;

  for (const offer of activeOffers) {
    const offerRes = calculateOfferDiscount(user.cart, offer);
    if (offerRes.discountAmount > offerDiscountAmount) {
      offerDiscountAmount = offerRes.discountAmount;
      appliedOffer = offerRes.appliedOffer;
    }
  }

  const discountedSubtotalForCoupon = subtotal - offerDiscountAmount;

  // 4. Handle coupon application
  let discount = 0;
  let couponRef = null;

  if (couponCode) {
    const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });
    if (!coupon) {
      throw new ApiError(404, "Coupon invalid or inactive");
    }
    
    if (new Date() > coupon.expiryDate) {
      throw new ApiError(400, "Coupon has expired");
    }

    if (coupon.usedCount >= coupon.usageLimit) {
      throw new ApiError(400, "Coupon limit reached");
    }

    if (discountedSubtotalForCoupon < coupon.minimumOrderValue) {
      throw new ApiError(400, `Minimum purchase of ₹${coupon.minimumOrderValue} required for this coupon after offer discounts`);
    }

    if (coupon.discountType === "PERCENTAGE") {
      discount = (discountedSubtotalForCoupon * coupon.discountValue) / 100;
    } else {
      discount = coupon.discountValue;
    }

    if (discount > discountedSubtotalForCoupon) {
      discount = discountedSubtotalForCoupon;
    }

    couponRef = coupon;
  }

  // 5. Calculate shipping and taxes
  const shippingCharge = discountedSubtotalForCoupon > 1500 ? 0 : 99; // Free shipping above 1500
  const gstRate = process.env.GST_RATE !== undefined ? parseFloat(process.env.GST_RATE) : 12;
  const tax = Math.round((discountedSubtotalForCoupon - discount) * (gstRate / 100) * 100) / 100;
  const totalAmount = Math.round((discountedSubtotalForCoupon - discount + shippingCharge + tax) * 100) / 100;

  // 6. Create the order
  const order = new Order({
    customer: req.user._id,
    items: orderItems,
    shippingAddress: {
      fullName: shippingAddressObj.fullName,
      phone: shippingAddressObj.phone,
      addressLine1: shippingAddressObj.addressLine1,
      addressLine2: shippingAddressObj.addressLine2,
      city: shippingAddressObj.city,
      state: shippingAddressObj.state,
      country: shippingAddressObj.country,
      postalCode: shippingAddressObj.postalCode,
    },
    paymentMethod,
    paymentStatus: "PENDING",
    orderStatus: "PENDING",
    subtotal,
    discount,
    shippingCharge,
    tax,
    totalAmount,
    notes,
    couponCode: couponCode ? couponCode.toUpperCase() : undefined,
    offerId: appliedOffer ? appliedOffer._id : undefined,
    offerName: appliedOffer ? appliedOffer.title : undefined,
    discountAmount: offerDiscountAmount,
    originalTotal: subtotal,
    finalTotal: totalAmount,
  });

  // 7. Payment method routing
  if (paymentMethod === "COD") {
    order.paymentStatus = "PENDING";
    order.orderStatus = "CONFIRMED";
    await order.save();

    // Reduce stock immediately for COD
    await reduceStockForOrder(order, req.user._id);

    // Apply coupon usage increment
    if (couponRef) {
      couponRef.usedCount += 1;
      await couponRef.save();
    }

    // Clear cart
    user.cart = [];
    await user.save();

    // Send order confirmation email
    try {
      await sendOrderConfirmationEmail(req.user.email, order);
    } catch (emailErr) {
      console.error("Order confirmation email failed to send:", emailErr);
    }

    // Trigger Admin Web Socket Notification
    sendOrderNotificationToAdmin(order);

    return res
      .status(201)
      .json(new ApiResponse(201, { order }, "Order placed successfully (Cash on Delivery)"));
  } else {
    // RAZORPAY: Create Razorpay Order Hash
    const razorpayOrder = await createRazorpayOrder(order._id.toString(), totalAmount);
    
    order.razorpayOrderId = razorpayOrder.id;
    await order.save();

    // Do NOT reduce stock or clear cart yet for online payment. 
    // It will be handled inside payment verification/webhook to prevent lockouts if checkout fails.

    return res.status(201).json(
      new ApiResponse(
        201,
        {
          order,
          razorpayOrder: {
            id: razorpayOrder.id,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
          },
        },
        "Razorpay checkout order generated"
      )
    );
  }
});

const getMyOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const totalItems = await Order.countDocuments({ customer: req.user._id });
  const paginationMeta = getPaginationData(totalItems, page, limit);

  const orders = await Order.find({ customer: req.user._id })
    .sort({ createdAt: -1 })
    .skip((paginationMeta.currentPage - 1) * paginationMeta.limit)
    .limit(paginationMeta.limit);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        orders,
        pagination: {
          totalItems: paginationMeta.totalItems,
          totalPages: paginationMeta.totalPages,
          currentPage: paginationMeta.currentPage,
          hasNextPage: paginationMeta.hasNextPage,
          hasPreviousPage: paginationMeta.hasPreviousPage,
        },
      },
      "User orders fetched successfully"
    )
  );
});

const getOrderById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const order = await Order.findById(id).populate("customer", "name email phone");

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  // Block users from reading other users' orders
  if (req.user.role !== "ADMIN" && order.customer._id.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Forbidden: You are not authorized to view this order");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, order, "Order retrieved successfully"));
});

const cancelOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason = "Cancelled by user" } = req.body;
  const order = await Order.findById(id).populate("customer", "name email");

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  // Check user authorization
  if (req.user.role !== "ADMIN" && order.customer._id.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Forbidden: You are not authorized to cancel this order");
  }

  // Customers can only cancel PENDING or CONFIRMED orders
  if (req.user.role !== "ADMIN" && !["PENDING", "CONFIRMED"].includes(order.orderStatus)) {
    throw new ApiError(400, `Cannot cancel order. Current status: ${order.orderStatus}`);
  }

  // Admin can cancel anything except DELIVERED
  if (req.user.role === "ADMIN" && ["DELIVERED", "CANCELLED"].includes(order.orderStatus)) {
    throw new ApiError(400, `Cannot cancel order at status: ${order.orderStatus}`);
  }

  const prevStatus = order.orderStatus;
  order.orderStatus = "CANCELLED";
  order.notes = order.notes ? `${order.notes} | Cancel reason: ${reason}` : `Cancel reason: ${reason}`;

  // If order was CONFIRMED or SHIPPED, stock was already reduced, so restore it!
  if (["CONFIRMED", "PACKED", "SHIPPED", "OUT_FOR_DELIVERY"].includes(prevStatus)) {
    await restoreStockForOrder(order, "RETURN", req.user._id);
  }

  // If payment was completed, initiate Razorpay refund
  if (order.paymentStatus === "COMPLETED" && order.paymentMethod === "RAZORPAY" && order.razorpayPaymentId) {
    try {
      await initiateRefund(order.razorpayPaymentId, order.totalAmount, {
        orderId: order._id.toString(),
        reason,
      });
      order.paymentStatus = "REFUNDED";
    } catch (refundError) {
      console.error("Refund failed on cancel: ", refundError.message);
      order.notes = `${order.notes} | Refund pending due to error: ${refundError.message}`;
    }
  }

  await order.save();

  // Send email update
  if (order.customer && order.customer.email) {
    try {
      await sendOrderStatusUpdateEmail(order.customer.email, order);
    } catch (emailErr) {
      console.error("Order cancellation email failed to send:", emailErr);
    }
  }

  // Socket notification
  sendOrderStatusNotificationToUser(order.customer._id.toString(), order);

  return res
    .status(200)
    .json(new ApiResponse(200, order, "Order cancelled successfully"));
});

export { placeOrder, getMyOrders, getOrderById, cancelOrder };
