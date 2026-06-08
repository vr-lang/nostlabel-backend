import mongoose from "mongoose";

const exchangeSchema = new mongoose.Schema(
  {
    exchangeNumber: {
      type: String,
      unique: true,
      index: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    currentSize: {
      type: String,
      enum: ["S", "M", "L", "XL", "XXL"],
      required: true,
    },
    requestedSize: {
      type: String,
      enum: ["S", "M", "L", "XL", "XXL"],
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: [
        "EXCHANGE_REQUESTED",
        "EXCHANGE_APPROVED",
        "EXCHANGE_REJECTED",
        "PICKUP_SCHEDULED",
        "PRODUCT_RECEIVED",
        "REPLACEMENT_PROCESSING",
        "REPLACEMENT_SHIPPED",
        "DELIVERED",
      ],
      default: "EXCHANGE_REQUESTED",
    },
    notes: {
      type: String,
      trim: true,
    },
    adminFeedback: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to generate exchange number
exchangeSchema.pre("save", async function (next) {
  if (this.isNew && !this.exchangeNumber) {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const random = Math.floor(1000 + Math.random() * 9000);
    this.exchangeNumber = `EXC-${dateStr}-${random}`;
  }
  next();
});

const Exchange = mongoose.model("Exchange", exchangeSchema);
export default Exchange;
