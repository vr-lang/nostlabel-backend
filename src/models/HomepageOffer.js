import mongoose from "mongoose";

const homepageOfferSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Offer title is required"],
      trim: true,
      default: "ANY 2 T-SHIRTS FOR ₹1400",
    },
    subtitle: {
      type: String,
      trim: true,
      default: "LIMITED TIME OFFER",
    },
    description: {
      type: String,
      trim: true,
      default: "Premium Oversized Tees",
    },
    price: {
      type: Number,
      required: true,
      default: 1400,
    },
    products: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    startDate: {
      type: Date,
      required: true,
      default: () => new Date(),
    },
    endDate: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
    ctaText: {
      type: String,
      default: "SHOP THE OFFER",
    },
    ctaLink: {
      type: String,
      default: "/collections/t-shirts",
    },
  },
  {
    timestamps: true,
  }
);

const HomepageOffer = mongoose.model("HomepageOffer", homepageOfferSchema);

export default HomepageOffer;
