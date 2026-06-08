import mongoose from "mongoose";

const customerNoteSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    note: {
      type: String,
      required: [true, "Note content cannot be empty"],
      trim: true,
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

customerNoteSchema.index({ customer: 1, createdAt: -1 });

const CustomerNote = mongoose.model("CustomerNote", customerNoteSchema);

export default CustomerNote;
