
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
      salePrice:{
        type:Number
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
      returnQuantity: { 
        type: Number, 
        default: 0 
      },
      status: {
        type: String,
        enum: [
          "Pending",
          "Shipped",
          "Out for delivery", 
          "Delivered", 
          "Cancelled",
          "Partially cancelled",
          "Returned",
          "Return processing",
          "Return processing-P",
          "Partially returned",
          "Return rejected"
        ],
        default: "Pending"
      },
      discount:{
        type:Number,
        default:0
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
      "Partially returned",
      "Partially delivered",
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
   paymentMethod: {
    type:String,
    required:true
   },
   paymentStatus:{
    type:String,
    enum:[
      "PAID",
      "PENDING"
    ],
    default:"PENDING"
   },
   razorpay: {
        orderId:{
          type:String,
        } ,
        paymentId:{
          type:String
        }
      },
  subTotal: { 
    type: Number,  
  },    
  totalAmount: { 
    type: Number, 
    required: true 
  },
  refundedAmount:{
    type:Number,
    default:0
  },
  netAmount:{
    type:Number,
    default:0
  },
  totalProductDiscount:{
    type:Number,
    default:0
  },
  discountValue:{
    type:Number,
    default:0
  },
  analyticsFieldsAdded:{
    type:Boolean,
    default:false,
  },
  retryCount:{
    type:Number,
    default:0
  }
}, { timestamps: true });

module.exports = mongoose.model("Order", orderSchema);

