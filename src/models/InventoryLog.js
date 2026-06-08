import mongoose from "mongoose";

const inventoryLogSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    variant: {
      size: {
        type: String,
        enum: ["S", "M", "L", "XL", "XXL"],
        required: true,
      },
      color: {
        type: String,
        required: true,
      },
    },
    type: {
      type: String,
      enum: ["SALE", "RETURN", "MANUAL"],
      required: true,
    },
    quantity: {
      type: Number,
      required: true, // can be positive or negative depending on action
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

inventoryLogSchema.index({ product: 1, createdAt: -1 });

const InventoryLog = mongoose.model("InventoryLog", inventoryLogSchema);

export default InventoryLog;
