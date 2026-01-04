const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true, 
    trim: true
  },
  discountType: {
    type: String,
    enum: ["percentage", "fixed"], 
    required: true
  },
  discountValue: {
    type: Number,
    required: true
  },
  minPurchase: {
    type: Number,
    default: 0 
  },
  maxDiscount: {
    type: Number,
    default: 0 
  },
    startDate: {
    type: Date,
    required: true
  },
  expiryDate: {
    type: Date,
    required: true
  },
  usageLimit: {
    type: Number,
    default: 1 
  },
  redemptions: {
    type: Number,
    default: 0
  },
  perUserLimit: {
    type: Number,
    default: 1 
  },
  status: {
    type: String,
    enum:["Active","Expired","Scheduled"],
    default: "Active"
  }
}, { timestamps: true });

module.exports = mongoose.model("Coupon", couponSchema);
