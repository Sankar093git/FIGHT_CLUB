const mongoose=require("mongoose");

const walletSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true
  },

  balance: {
    type: Number,
    required: true,
    default: 0
  },

  transactions: [
    {
      transactionId: { type: String, required: true },
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
      amount: { type: Number, required: true },

      relatedOrderId: { type: String },
      relatedPaymentId: { type: String },

      description: { type: String, default: "" },
      createdAt: { type: Date, default: Date.now }
    }
  ],

  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const Wallet=mongoose.model("Wallet",walletSchema);

module.exports=Wallet;