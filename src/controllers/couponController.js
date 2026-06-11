import Coupon from "../models/Coupon.js";
import User from "../models/User.js";
import Order from "../models/Order.js";
import Offer from "../models/Offer.js";
import { calculateOfferDiscount } from "./offerController.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Admin: Create Coupon
const createCoupon = asyncHandler(async (req, res) => {
  const {
    code,
    discountType,
    discountValue,
    minimumOrderValue,
    usageLimit,
    expiryDate,
    isActive,
  } = req.body;

  const couponExists = await Coupon.findOne({ code: code.toUpperCase() });
  if (couponExists) {
    throw new ApiError(409, "Coupon code already exists");
  }

  const coupon = await Coupon.create({
    code: code.toUpperCase(),
    discountType,
    discountValue,
    minimumOrderValue: minimumOrderValue || 0,
    usageLimit: usageLimit || 100,
    expiryDate,
    isActive: isActive !== undefined ? isActive : true,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, coupon, "Coupon created successfully"));
});

// Admin: Update Coupon
const updateCoupon = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const coupon = await Coupon.findById(id);

  if (!coupon) {
    throw new ApiError(404, "Coupon not found");
  }

  const updateFields = { ...req.body };
  if (req.body.code) {
    updateFields.code = req.body.code.toUpperCase();
    const existingCoupon = await Coupon.findOne({ code: updateFields.code });
    if (existingCoupon && existingCoupon._id.toString() !== id) {
      throw new ApiError(409, "Coupon code already exists");
    }
  }

  const updatedCoupon = await Coupon.findByIdAndUpdate(
    id,
    { $set: updateFields },
    { new: true, runValidators: true }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, updatedCoupon, "Coupon updated successfully"));
});

// Admin: Delete Coupon
const deleteCoupon = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const coupon = await Coupon.findById(id);

  if (!coupon) {
    throw new ApiError(404, "Coupon not found");
  }

  await Coupon.findByIdAndDelete(id);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Coupon deleted successfully"));
});

// Admin/Customer: List all coupons
const getCoupons = asyncHandler(async (req, res) => {
  const filter = {};
  const isAdminRequest = req.user && req.user.role === "ADMIN";

  if (!isAdminRequest) {
    filter.isActive = true;
    filter.expiryDate = { $gt: new Date() };
  }

  const coupons = await Coupon.find(filter).sort({ expiryDate: 1 });

  if (isAdminRequest) {
    const couponsWithMetrics = await Promise.all(
      coupons.map(async (coupon) => {
        const successfulOrders = await Order.find({
          couponCode: coupon.code,
          orderStatus: { $ne: "CANCELLED" },
          paymentStatus: { $ne: "FAILED" },
        });

        const totalUsage = successfulOrders.length;
        const uniqueCustomers = new Set(
          successfulOrders.map((o) => o.customer.toString())
        ).size;
        const revenueGenerated = successfulOrders.reduce(
          (sum, o) => sum + o.totalAmount,
          0
        );
        const remainingUsage = Math.max(0, coupon.usageLimit - totalUsage);

        // Keep database usedCount in sync
        if (coupon.usedCount !== totalUsage) {
          coupon.usedCount = totalUsage;
          await coupon.save();
        }

        return {
          ...coupon.toObject(),
          metrics: {
            totalUsage,
            uniqueCustomers,
            revenueGenerated,
            remainingUsage,
          },
        };
      })
    );

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          couponsWithMetrics,
          "Coupons retrieved successfully with metrics"
        )
      );
  }

  return res
    .status(200)
    .json(new ApiResponse(200, coupons, "Coupons retrieved successfully"));
});

// Customer: Apply Coupon
const applyCoupon = asyncHandler(async (req, res) => {
  const { code } = req.body;
  const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });

  if (!coupon) {
    throw new ApiError(404, "Coupon invalid or inactive");
  }

  if (new Date() > coupon.expiryDate) {
    throw new ApiError(400, "Coupon has expired");
  }

  if (coupon.usedCount >= coupon.usageLimit) {
    throw new ApiError(400, "Coupon usage limit has been reached");
  }

  const user = await User.findById(req.user._id).populate({
    path: "cart.product",
    populate: { path: "category" }
  });
  if (!user || user.cart.length === 0) {
    throw new ApiError(400, "Your shopping cart is empty");
  }

  let cartSubtotal = 0;
  user.cart.forEach((item) => {
    const activePrice = item.product.discountPrice || item.product.price;
    cartSubtotal += activePrice * item.quantity;
  });

  const now = new Date();
  const activeOffers = await Offer.find({
    isActive: true,
    startDate: { $lte: now },
    endDate: { $gte: now },
  }).sort({ priority: -1 });

  let offerDiscountAmount = 0;
  for (const offer of activeOffers) {
    const offerRes = calculateOfferDiscount(user.cart, offer);
    if (offerRes.discountAmount > offerDiscountAmount) {
      offerDiscountAmount = offerRes.discountAmount;
    }
  }

  const subtotalAfterOffer = cartSubtotal - offerDiscountAmount;

  if (subtotalAfterOffer < coupon.minimumOrderValue) {
    throw new ApiError(
      400,
      `Minimum purchase amount of ₹${coupon.minimumOrderValue} is required to apply this coupon. Your current subtotal after offer discount is ₹${subtotalAfterOffer}`
    );
  }

  let discountAmount = 0;
  if (coupon.discountType === "PERCENTAGE") {
    discountAmount = (subtotalAfterOffer * coupon.discountValue) / 100;
  } else {
    discountAmount = coupon.discountValue;
  }

  if (discountAmount > subtotalAfterOffer) {
    discountAmount = subtotalAfterOffer;
  }

  const finalTotal = subtotalAfterOffer - discountAmount;

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        subtotal: cartSubtotal,
        discountAmount: Math.round(discountAmount * 100) / 100,
        finalTotal: Math.round(finalTotal * 100) / 100,
      },
      "Coupon applied successfully"
    )
  );
});

export { createCoupon, updateCoupon, deleteCoupon, getCoupons, applyCoupon };
