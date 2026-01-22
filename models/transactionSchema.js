const mongoose=require("mongoose");

const walletTransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    transactionId: {
      type: String,
      required: true,
      unique: true
    },

    type: {
      type: String,
      enum: ["credit", "debit"],
      required: true
    },

    method: {
      type: String,
      enum: ["refund", "manual", "admin", "orderPayment", "promo"],
      required: true
    },

    amount: {
      type: Number,
      required: true
    },

    relatedOrderId: {
      type: String,
      required:true
    },

    description: {
      type: String,
      default: ""
    }
  },
  { timestamps: true }
);

const WalletTransaction = mongoose.model(
  "WalletTransaction",
  walletTransactionSchema
);

module.exports = WalletTransaction;
