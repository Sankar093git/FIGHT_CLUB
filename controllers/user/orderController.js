import User from "../../models/userSchema.js";
import Order from "../../models/orderSchema.js";
import crypto from "crypto";
import Product from "../../models/productSchema.js";
import Coupon from "../../models/couponSchema.js";
import Wallet from "../../models/walletShema.js";
import mongoose from "mongoose";
import * as paymentController from "../../controllers/user/paymentController.js";
import Transactions from "../../models/transactionSchema.js";
import Constants from "../../models/constantSchema.js";
import STATUS_CODES from "../../utils/statusCode.js";

export const placeOrder = async (req, res) => {
  try {
    const userId = req.session.user;
    const constants = await Constants.find({});
    let shipping = constants[0].shipping;
    let taxes = constants[0].taxes;

    const paymentMethod = req.body.paymentMethod;
    const couponCode = req.body.couponCode || req.session.coupon;

    console.log(couponCode);

    const userData = await User.findById(userId).populate("cart.product");

    if (!userData || userData.cart.length === 0) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: "Cart is empty" });
    }

    //Stock validation
    for (let x of userData.cart) {
      const variant = x.product.variants.find(v => v.size === x.size);
      if (!variant || variant.stock === 0) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: `Variant not found for ${x.product.productName}/Out of stock` })
      }
      if (x.quantity > variant.stock) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: `Only ${variant.stock} units left for${x.product.productName}` })
      }
    }

    const validCartItems = userData.cart.filter(item => item.product.isBlocked === false);

    if (validCartItems.length === 0) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: "One or more product is no longer available" });
    }

    let totalAmount = validCartItems.reduce((acc, item) => {
      const price = item.product.salesPrice || 0;
      return acc + (price * item.quantity)
    }, 0) + shipping + taxes;
    console.log(totalAmount);
    if (paymentMethod == "COD" && totalAmount > 1000) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: "COD not possible, please select another payment method!" })
    }
    let discountValue = 0;
    if (couponCode) {
      const couponDetails = await Coupon.findOne({ code: couponCode });
      if (couponDetails.discountType == "fixed") {
        discountValue = couponDetails.discountValue;
        totalAmount = totalAmount - discountValue;
        console.log("discount value", discountValue);
      } else if (couponDetails.discountType == "percentage") {
        discountValue = totalAmount * (couponDetails.discountValue / 100);
        if (discountValue > couponDetails.maxDiscount) {
          discountValue = couponDetails.maxDiscount
        }
        totalAmount = totalAmount - discountValue;
      }
    }
    const addressId = req.body.addressId;
    const selectedAddress = userData.address.find(
      addr => addr._id.toString() === addressId
    );

    if (!selectedAddress) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: "Invalid address" });
    }

    const orderId = "ORD-" + crypto.randomBytes(4).toString("hex");

    if (paymentMethod === "COD" || paymentMethod === "WALLET") {
      for (let x of userData.cart) {
        const result = await Product.updateOne(
          { _id: x.product._id, "variants.size": x.size },
          { $inc: { "variants.$.stock": -x.quantity } }
        );

        if (result.modifiedCount === 0) {
          return res.status(STATUS_CODES.BAD_REQUEST).json({
            success: false,
            message: "Stock changed. Please try again."
          });
        }
      }
    }

    if (paymentMethod === "WALLET") {
      const walletDetails = await Wallet.findOne({ userId: req.session.user });
      if (!walletDetails) {
        res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: "Your wallet has not been initialised" });
      } else if (walletDetails.balance === 0 || walletDetails.balance < totalAmount) {
        res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: "Insufficient balance!" });
      } else {
        const transactionId = "TRA-" + crypto.randomBytes(4).toString("hex");
        await Wallet.updateOne({ userId: req.session.user }, { $inc: { balance: -totalAmount } });
        const newTransaction = new Transactions({
          userId: req.session.user,
          transactionId: transactionId,
          type: "debit",
          method: "orderPayment",
          amount: totalAmount,
          relatedOrderId: orderId,
          description: "Order Payment"
        })
        await newTransaction.save()
      }
    }
    const newOrder = new Order({
      user: userId,
      orderId: orderId,
      products: validCartItems,
      address: selectedAddress,
      totalAmount: totalAmount,
      discountValue: discountValue,
      paymentMethod: paymentMethod,
      paymentStatus: paymentMethod === "WALLET" ? "PAID" : "PENDING",
      status: "Pending"
    });

    await newOrder.save();

    await User.updateOne({ _id: userId }, { $set: { cart: [] } });

    req.session.coupon = null;
    req.session.discount = null;
    req.session.newTotal = null;

    res.status(STATUS_CODES.CREATED).json({ success: true, orderId: orderId });

  } catch (error) {
    console.error("Error while placing order:", error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: "Failed to place order" });
  }
};

export const orderSuccess = async (req, res) => {
  try {
    await setDiscountvalue();
    await setproductDiscountPerOrder();
    res.status(STATUS_CODES.OK).render("orderPlaced");
  } catch (error) {
    console.error("Error while loading success page :", error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).redirect("/error");
  }
}

export const paymentFailure = async (req, res) => {
  try {
    const orderId = req.query.orderId;
    const userDetails = await User.findOne({ _id: req.session.user });
    await Order.updateOne({ orderId: orderId }, { $inc: { retryCount: 1 } });
    res.status(STATUS_CODES.OK).render("orderFailed", {
      orderId: orderId,
      user: userDetails
    });
  } catch (error) {
    console.error("Payment failure page:", error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).redirect("/error")
  }
}

export const updatePayment = async (req, res) => {
  try {
    console.log("Payment updation is triggering!");
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const orderId = req.params.orderId;
    const orderDetails = await Order.findOne({ orderId: orderId });
    if (!orderDetails) {
      return res.status(STATUS_CODES.NOT_FOUND).json({ success: false, message: "Order not found" });
    }
    if (orderDetails.paymentStatus == "PAID") {
      return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: "Payment already done" })
    }
    let isPaid = await paymentController.verifyPayment({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature: razorpay_signature
    });
    if (!isPaid) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: "Payment verification failed" });
    }

    orderDetails.paymentStatus = isPaid == true ? "PAID" : "PENDING"
    orderDetails.razorpay = {
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id
    },

      await orderDetails.save();
    for (let item of orderDetails.products) {
      const id = item.product._id;
      const size = item.size;
      const quantity = item.quantity;
      await Product.updateOne({ _id: id, "variants.size": size, "variants.stock": { $gte: quantity } }, { $inc: { "variants.$.stock": -quantity } });
    }
    console.log("Payment verified and stock updated");
    // Referal reward logic
    const userDetails = await User.findOne({ _id: req.session.user });
    if (userDetails.referedBy) {
      const refereeDetails = await User.findOne({ email: userDetails.referedBy })
      const orders = await Order.countDocuments({ user: req.session.user });
      if (orders === 1) {
        const walletDetails = await Wallet.findOne({ userId: refereeDetails._id });
        if (!walletDetails) {
          const newWallet = new Wallet({
            userId: refereeDetails._id,
            balance: 200
          });
          await newWallet.save();
        } else {
          await Wallet.updateOne({ userId: refereeDetails._id }, { $inc: { balance: 200 } });
        }
        const transactionId = "TRA-" + crypto.randomBytes(4).toString("hex");
        const newTransaction = new Transactions({
          userId: refereeDetails._id,
          transactionId: transactionId,
          type: "credit",
          method: "promo",
          amount: 200,
          relatedOrderId: orderId,
          description: "Referal reward"
        })

        await newTransaction.save();
      }
    }
    //referal reward logic ends here
    return res.status(STATUS_CODES.OK).json({
      success: true,
      message: "Payment verified and stock updated",
      orderId: orderDetails.orderId
    });
  } catch (error) {
    console.error("Payment updation:", error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Something went wrong!' });
  }
}

export const cancelOrder = async (req, res) => {
  try {
    const userId = req.session.user;
    const orderId = req.params.id;
    const cancelMessage = req.body.message;

    const order = await Order.findOne({
      orderId: orderId,
      user: userId
    }).populate("products.product")

    if (!order) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: "Order not found"
      });
    }

    if (order.status === "Delivered") {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: "Delivered orders cannot be cancelled"
      });
    }

    if (["Cancelled", "Partially cancelled"].includes(order.status)) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: "Order is already cancelled"
      });
    }
    const validProducts = order.products.filter((prod) => prod.status == "Pending");
    const refundAmount = validProducts.map((prod) => prod.quantity * prod.product.salesPrice).reduce((acc, num) => acc + num, 0) - (order.discountValue);

    order.products.forEach(prod => {
      if (!["Returned", "Delivered", "Cancelled", "Return Processing", "Shipped", "Return rejected"].includes(prod.status)) {
        prod.status = "Cancelled";
      }
    });

    let statuses = order.products.map((p) => p.status);

    if (statuses.every((s) => s === "Cancelled")) {
      order.status = "Cancelled";
    } else {
      order.status = "Partially cancelled";
    }
    order.reasonForCancellation = cancelMessage;
    await order.save();
    // Wallet-logic
    const transactionId = "TRA-" + crypto.randomBytes(4).toString("hex");
    if (order.paymentStatus == "PAID" && refundAmount > 0) {
      let newTransaction = new Transactions({
        userId: userId,
        transactionId: transactionId,
        type: "credit",
        method: "refund",
        amount: refundAmount,
        relatedOrderId: orderId,
        description: cancelMessage
      })

      await newTransaction.save();

      const walletDetails = await Wallet.findOne({ userId: req.session.user });
      if (!walletDetails) {
        let newWallet = new Wallet({
          userId: req.session.user,
          balance: refundAmount,
        })
        await newWallet.save();
      } else {
        await Wallet.updateOne({ userId: req.session.user }, { $inc: { balance: refundAmount } })
      }
    }
    // Wallet logic ends here
    for (const prod of validProducts) {
      await Product.updateOne(
        { _id: prod.product, "variants.size": prod.size },
        { $inc: { "variants.$.stock": prod.quantity } }
      );
    }

    res.status(STATUS_CODES.OK).json({ success: true });

  } catch (error) {
    console.error("Error while cancelling order:", error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false });
  }
};

export const returnOrder = async (req, res) => {
  try {
    const userId = req.session.user;
    const orderId = req.params.id;
    const returnMessage = req.body.message;

    const order = await Order.findOne({
      orderId: orderId,
      user: userId
    });

    if (!order) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: "Order not found"
      });
    }

    if (order.status !== "Delivered") {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: "Only delivered orders can be returned"
      });
    }

    order.products.forEach(prod => {
      if (!["Returned", "Cancelled", "Return Processing", "Shipped", "Return rejected"].includes(prod.status)) {
        prod.status = "Return processing";
      }
    });

    order.status = "Processing return";
    order.reasonForReturn = returnMessage;

    await order.save();

    res.status(STATUS_CODES.OK).json({
      success: true,
      message: "Return request submitted",
      reason: returnMessage
    });

  } catch (error) {
    console.error("Error while returning order:", error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false });
  }
};

export const displayOrder = async (req, res) => {
  try {
    const userId = req.session.user;
    const orderId = req.query.id;

    const order = await Order.findOne({
      orderId: orderId,
      user: userId
    }).populate("products.product");

    if (!order) {
      return res.redirect("/error");
    }

    const subTotal = order.products.reduce((acc, item) => {
      const price = item.salePrice ?? item.product.salesPrice;
      return acc + (price * item.quantity);
    }, 0);

    const constants = await Constants.find({});
    let shipping = constants[0].shipping;
    let taxes = constants[0].taxes;
    const discount = order.discountValue;
    const total = subTotal + shipping + taxes - discount;

    res.status(STATUS_CODES.OK).render("orderDetails", {
      Product: order.products,
      addr: order.address,
      subtotal: subTotal,
      discount,
      shipping,
      taxes,
      total,
      status: order.status,
      orderId: order.orderId,
      createdAt: order.createdAt
    });

  } catch (error) {
    console.error("Error while displaying order:", error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).redirect("/error");
  }
};

export const addAddress = async (req, res) => {
  try {
    await User.updateOne({ _id: req.session.user }, { $addToSet: { address: req.body } });
    res.status(STATUS_CODES.OK).redirect("/checkout");

  } catch (error) {
    console.error("Error while adding address", error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).redirect("/error");
  }
}

export const editAddress = async (req, res) => {
  try {
    const addressId = req.params.id;
    const { label, street, city, state, country, postalCode, phone, isDefault } = req.body;

    await User.updateOne({ _id: req.session.user, "address._id": addressId }, {
      $set: {
        "address.$.label": label,
        "address.$.street": street,
        "address.$.city": city,
        "address.$.state": state,
        "address.$.country": country,
        "address.$.postalCode": postalCode,
        "address.$.phone": phone,
        "address.$.isDefault": isDefault
      }
    });
    res.status(STATUS_CODES.OK).redirect("/checkout");
  } catch (error) {
    console.error("Error while editing address : ", error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).redirect("/error");
  }
}

export const singleCancel = async (req, res) => {
  try {
    const productId = new mongoose.Types.ObjectId(req.params.productId);
    console.log(productId);
    const { id, size, value, quantity } = req.body;

    const orderDetails = await Order.findOne({ orderId: id });

    if (orderDetails.discountValue > 0 && orderDetails.products.length > 1) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: "Single cancel not possilble on coupon applied orders!" });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(STATUS_CODES.NOT_FOUND).json({ success: false, message: "Product not found" });
    }

    const productDetails = orderDetails.products.find((item) => productId.equals(item.product) && item.size == size);

    if (!productDetails) {
      return res.status(STATUS_CODES.NOT_FOUND).json({ success: false, message: "Product not found" });
    }

    let orderUpdate;
    let stockToRestore;

    if (value) {
      orderUpdate = {
        $inc: { "products.$[item].quantity": -value },
        $set: { "products.$[item].status": "Partially cancelled" }
      };
      stockToRestore = value;
    } else {
      orderUpdate = {
        $set: { "products.$[item].status": "Cancelled" }
      };
      stockToRestore = quantity;
    }

    await Order.updateOne(
      { orderId: id },
      orderUpdate,
      {
        arrayFilters: [
          {
            "item.product": productId,
            "item.size": size
          }
        ]
      }
    );
    let refundAmount = 0
    if (value) {
      refundAmount = productDetails.salePrice * value;
    } else {
      refundAmount = productDetails.salePrice * quantity;
    }
    const order = await Order.findOne({ orderId: id });
    const products = order.products;
    const totalStatus = deriveTotalStatus(products);
    order.status = totalStatus
    order.totalAmount -= refundAmount;
    await order.save();

    const transactionId = "TRA-" + crypto.randomBytes(4).toString("hex");

    const walletDetails = await Wallet.findOne({ userId: req.session.user });
    if (!walletDetails) {
      const newWallet = new Wallet({
        userId: req.session.user,
        balance: refundAmount
      });
      await newWallet.save();
    } else {
      await Wallet.updateOne({ userId: req.session.user }, { $inc: { balance: refundAmount } });
    }
    const newTransaction = new Transactions({
      userId: req.session.user,
      transactionId: transactionId,
      type: "credit",
      method: "refund",
      amount: refundAmount,
      relatedOrderId: id,
      description: "Cancel message"
    });
    await newTransaction.save();

    await Product.updateOne(
      { _id: productId, "variants.size": size },
      { $inc: { "variants.$.stock": stockToRestore } }
    );

    return res.status(STATUS_CODES.OK).json({
      success: true,
      message: `Cancellation for ${product.productName} processed.`
    });

  } catch (error) {
    console.error("Error while canceling product:", error.message);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: "Something went wrong!" });
  }
};

export const singleReturn = async (req, res) => {
  try {
    const productId = new mongoose.Types.ObjectId(req.params.productId);
    const { id, size, value } = req.body;
    const orderDetails = await Order.findOne({ orderId: id });

    const matchedProduct = orderDetails.products.find((item) => item.product.equals(productId) && item.size == size);
    const rQuantity = matchedProduct.quantity;

    if (orderDetails.discountValue > 0 && orderDetails.products.length > 1) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: "Single return not possilble on coupon applied orders!" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(STATUS_CODES.NOT_FOUND).json({ success: false, message: "Product not found" });
    }

    const productName = product.productName;
    console.log("Processing return for:", productName, "Size:", size);

    let updateFields = {};
    if (value == rQuantity) {
      updateFields = {
        "products.$[elem].status": "Return processing",
        "products.$[elem].returnQuantity": value
      }
    } else if (value < rQuantity) {
      updateFields = {
        "products.$[elem].status": "Return processing-P",
        "products.$[elem].returnQuantity": value
      }
    }

    const result = await Order.updateOne(
      { orderId: id },
      { $set: updateFields },
      {
        arrayFilters: [
          {
            "elem.product": productId,
            "elem.size": size
          }
        ]
      }
    );

    if (result.matchedCount === 0) {
      return res.status(STATUS_CODES.NOT_FOUND).json({ success: false, message: "Order or Item matching size not found" });
    }

    const responseMsg = value
      ? "Refund request has been submitted"
      : "Your refund shall be processed";
    const order = await Order.findOne({ orderId: id });
    const products = order.products;
    const totalStatus = deriveTotalStatus(products);
    order.status = totalStatus
    await order.save();

    return res.status(STATUS_CODES.OK).json({ success: true, message: responseMsg });

  } catch (error) {
    console.error("Error while returning a single product:", error.message);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: "Internal Server Error" });
  }
};

function deriveTotalStatus(products) {

  const statuses = products.map(p => p.status);

  if (statuses.every(s => s === "Cancelled")) return "Cancelled";

  const activeItems = statuses.filter(s => s !== "Cancelled" && s !== "Returned");

  if (activeItems.some(s => s === "Pending")) return "Processing";
  if (activeItems.every(s => s === "Shipped")) return "Shipped";
  if (activeItems.every(s => s === "Out for delivery")) return "Out for delivery";
  if (activeItems.every(s => s === "Delivered")) return "Delivered";
  if (activeItems.every(s => s === "Returned")) return "Returned";
  if (activeItems.every(s => s === "Return processing" || s === "Return processing(P)")) return "Processing return";

  return "Processing";
}

async function setDiscountvalue() {
  try {
    const orderDetails = await Order.find({ analyticsFieldsAdded: false }).populate("products.product");
    for (let order of orderDetails) {
      for (let item of order.products) {
        item.salePrice = item.product.salesPrice;
        item.discount = item.product.productOffer > item.product.categoryOffer ? item.product.productOffer : item.product.categoryOffer || 0;
      }
      await order.save();
      await Order.updateMany(
        { analyticsFieldsAdded: false },
        [
          {
            $set: {
              subtotal: {
                $reduce: {
                  input: "$products",
                  initialValue: 0,
                  in: {
                    $add: [
                      "$$value",
                      { $multiply: ["$$this.salePrice", "$$this.quantity"] }
                    ]
                  }
                }
              }
            }
          }
        ]
      );
    }
  } catch (error) {
    console.error("Setting discount value per product : ", error)
  }
}

async function setproductDiscountPerOrder() {
  try {
    const orderDetails = await Order.find({ analyticsFieldsAdded: false });

    for (let order of orderDetails) {
      let totalOffer = order.products.map((item) => item.discount).reduce((acc, num) => acc + num, 0);
      order.totalProductDiscount = totalOffer;
      order.analyticsFieldsAdded = true;
      await order.save();
    }
  } catch (error) {
    console.error("setproductDiscountPerOrder : ", error);
  }
}