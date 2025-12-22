// Order.js
const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  orderId: {
    type: String,
    required: true,
    unique: true
  },

  products: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true
      },
      size: {
        type: String,
        required: true
      },
      quantity: {
        type: Number,
        required: true,
        min: 1
      },
      returnQuantity:{
        type:Number,
        default:0
      },
      status:{
        type:String,
        enum:[
          "Pending",
          "Cancelled",
          "Partially cancelled",
          "Returned",
          'Return processing',
          'Return processing(P)',
          "Partially returned",
          "Return rejected"
        ],
        default:"Pending"
      }
    }
  ],

  address: {
    label: String,
    phone: String,
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: String
  },

  status: {
    type: String,
    enum: [
      "Pending",
      "Processing",
      "Shipped",
      "Out for delivery",
      "Delivered",
      "Cancelled",
      "Processing return",
      "Return rejected",
      "Returned"
    ],
    default: "Pending"
  },

  reasonForReturn: {
    type: String,
    default: "N/A"
  },

  reasonForCancellation: {
    type: String,
    default: "N/A"
  },

  totalAmount: {
    type: Number,
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model("Order", orderSchema);
