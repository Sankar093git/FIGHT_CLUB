import razorpay from "../../config/razorpay.js";
import Order from "../../models/orderSchema.js";
import crypto from "crypto";
import STATUS_CODES from "../../utils/statusCode.js";

export const createRazorpayOrder = async (req, res) => {
  try {
    const orderId = req.query.orderId;
    let totalAmount = 0;
    const currency = "INR"
    if (orderId) {
      const orderDetails = await Order.findOne({ orderId: orderId });
      if (orderDetails.paymentStatus === "PAID") {
        return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: "Order is already paid." });
      }

      totalAmount = orderDetails.totalAmount;

    } else {
      return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: "Order does not exist" })
    }
    const options = {
      amount: totalAmount * 100,
      currency: currency,
      receipt: `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    res.status(STATUS_CODES.OK).json({
      success: true,
      order
    });
  } catch (error) {
    console.error(error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Order creation failed"
    });
  }
}

export const verifyPayment = async ({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) => {
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