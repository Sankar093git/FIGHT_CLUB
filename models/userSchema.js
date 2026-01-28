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
    referalCode:{
      type:String
    },
    referedBy:{
      type:String
    },
    redeemedCoupons:[String],
    cart: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        size:{
          type:String,
          required:true
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
]
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

module.exports = User;

