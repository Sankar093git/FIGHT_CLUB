const razorpay = require("../../config/razorpay");
const mongoose = require("mongoose");
const User=require("../../models/userSchema");
const crypto = require("crypto");

const createRazorpayOrder = async (req, res) => {
  try {
        const userId=req.session.user;
        const userDetails= await User.findOne({_id:userId}).populate("cart.product");
        let totalAmount=0;
        for(let item of userDetails.cart){
            totalAmount+=item.product.salesPrice*item.quantity;
        }
    
    if (!totalAmount || totalAmount <= 0) {
        return res.status(400).json({
        success: false,
        message: "Cart is empty"
       });
     }

    const options = {
      amount: totalAmount * 100,
      currency: "INR",
      receipt: `receipt_${Date.now()}`
    };

    const order = await razorpay.orders.create(options);

    res.status(200).json({
      success: true,
      order
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Order creation failed"
    });
  }
}

const verifyPayment = async ( {razorpay_order_id,razorpay_payment_id,razorpay_signature}) => {
  try {
    const hmac = crypto.createHmac(
      "sha256",
      process.env.RAZORPAY_KEY_SECRET
    );

    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const generatedSignature = hmac.digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return false
    }
    return true
  } catch (error) {
    console.error("Verify payment error:", error);
    return false
  }
}


module.exports={
    createRazorpayOrder,
    verifyPayment
}
