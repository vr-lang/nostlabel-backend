import mongoose from "mongoose";

const offerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Offer title is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    offerType: {
      type: String,
      enum: [
        "ANNOUNCEMENT_ONLY",
        "BUY_X_GET_Y",
        "FIXED_BUNDLE_PRICE",
        "PERCENTAGE_DISCOUNT",
        "FIXED_DISCOUNT",
      ],
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },
    endDate: {
      type: Date,
      required: [true, "End date is required"],
    },
    priority: {
      type: Number,
      default: 0,
    },
    displayLocation: {
      type: String,
      enum: ["TOP_BAR", "HOMEPAGE_BANNER", "PRODUCT_PAGE_BANNER"],
      default: "TOP_BAR",
    },
    rules: {
      buyQuantity: { type: Number, min: 1 },
      buyCategory: { type: String },
      bundlePrice: { type: Number, min: 0 },
      getYQuantity: { type: Number, min: 1 },
      getYCategory: { type: String },
      getYDiscountType: { type: String, enum: ["FREE", "PERCENTAGE"], default: "FREE" },
      getYDiscountValue: { type: Number },
      discountPercentage: { type: Number, min: 0, max: 100 },
      discountAmount: { type: Number, min: 0 },
      minOrderValue: { type: Number, default: 0 },
      applicableCategories: [{ type: String }],
    },
  },
  {
    timestamps: true,
  }
);

// Method to verify if offer is currently active based on date range and flag
offerSchema.methods.isCurrentlyActive = function () {
  const now = new Date();
  const isWithinDate = now >= this.startDate && now <= this.endDate;
  return this.isActive && isWithinDate;
};

const Offer = mongoose.model("Offer", offerSchema);

export default Offer;
