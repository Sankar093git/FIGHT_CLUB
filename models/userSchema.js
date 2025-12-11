const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    userImage: {
      type: String,
      default:null,
    },
    phone: {
    type: String,
    required: function () {
    return !this.googleId;
  },
},
    password: {
    type: String,
    required: function () {
    return !this.googleId;
  },
},
    isBlocked: {
      type: Boolean,
      default: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    googleId: { 
      type: String 
    },
    address: [
      {
        label: {
          type: String,
          required: true,
        },
        phone: {
          type: String,
          required: true,
        },
        street: {
          type: String,
          required: true,
        },
        city: {
          type: String,
          required: true,
        },
        state: {
          type: String,
          required: true,
        },
        postalCode: {
          type: String,
          required: true,
        },
        country: {
          type: String,
          required: true,
        },
        isDefault: {
          type: Boolean,
          default: false, 
        },
      },
    ],
    cart: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: {
          type: Number,
          default: 1,
          min: 1,
        },
      },
    ],

    wishlist: [
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true
    }
  }
],
    orders: [
      {
        name:{
          type:String,
          required:true
        },
        email:{
          type:String,
          required:true
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
              required: true,
            },
            quantity: {
              type: Number,
              required: true,
              min: 1,
            },
          },
        ],
        address:{
          label: { 
            type: String, 
            required: true 
          },
          phone: { 
            type: String, 
            required: true 
          },
          street: { 
            type: String, 
            required: true 
          },
          city: { 
            type: String, 
            required: true 
          },
          state: { 
            type: String, 
            required: true 
          },
          postalCode: { 
            type: String, 
            required: true 
          },
          country: { 
            type: String, 
            required: true 
          }
         },
        status: {
          type: String,
          enum: ["Pending", "Processing", "Shipped","Out for delivery", "Delivered", "Cancelled","Processing return","Return rejected", "Returned"],
          default: "Pending",
        },
        reasonForReturn:{
          type:String,
          required:true,
          default:"N/A"
        },
        totalAmount: {
          type: Number,
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ]
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

module.exports = User;

