import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
    immutable: true,
  },
  type: {
    type: String,
    enum: ["income", "expense"],
    required: true,
  },
  amountMinor: {
    type: Number,
    required: true,
    min: 1,
    max: Number.MAX_SAFE_INTEGER,
    validate: Number.isSafeInteger,
  },
  currency: {
    type: String,
    required: true,
    uppercase: true,
    match: /^[A-Z]{3}$/,
  },
  category: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 64,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500,
  },
  merchant: {
    type: String,
    trim: true,
    maxlength: 128,
  },
  transactionDate: {
    type: Date,
    required: true,
  },
}, {
  timestamps: true,
  strict: "throw",
});

export const Transaction =
  mongoose.models.Transaction ??
  mongoose.model("Transaction", transactionSchema);
