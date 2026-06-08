import mongoose from "mongoose";

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, "Coupon code is required"],
      unique: true,
      uppercase: true,
      trim: true,
    },
    discountType: {
      type: String,
      enum: ["PERCENTAGE", "FIXED"],
      required: true,
    },
    discountValue: {
      type: Number,
      required: true,
      min: 0,
    },
    minimumOrderValue: {
      type: Number,
      default: 0,
      min: 0,
    },
    usageLimit: {
      type: Number,
      required: true,
      min: 1,
      default: 100,
    },
    usedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Method to check if coupon is valid for a given order amount
couponSchema.methods.isValid = function (orderAmount) {
  const isExpired = new Date() > this.expiryDate;
  const isLimitReached = this.usedCount >= this.usageLimit;
  const isMeetMinimum = orderAmount >= this.minimumOrderValue;

  return this.isActive && !isExpired && !isLimitReached && isMeetMinimum;
};

const Coupon = mongoose.model("Coupon", couponSchema);

export default Coupon;
