import Product from "../../models/productSchema.js";
import Order from "../../models/orderSchema.js";
import mongoose from "mongoose";
import Wallet from "../../models/walletShema.js";
import Transaction from "../../models/transactionSchema.js";
import Constants from "../../models/constantSchema.js";
import User from "../../models/userSchema.js";
import crypto from "crypto";
import STATUS_CODES from "../../utils/statusCode.js";

export const getOrderList = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 4;
    const skip = (page - 1) * limit;
    const { search, status, sort, date } = req.query;

    let filter = {};

    if (search) {
      if (/^ORD-[A-Fa-f0-9]{8}$/.test(search)) {
        filter.orderId = search;
      } else if (/^[A-Za-z][A-Za-z ]{1,50}$/.test(search)) {
        filter.customerName = { $regex: search, $options: "i" };
      } else if (/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(search)) {
        filter.customerEmail = search;
      }
    }

    if (status && status !== "") {
      filter.status = status;
    }

    if (date) {
      const selectedDate = new Date(date);
      const nextDate = new Date(selectedDate);
      nextDate.setDate(selectedDate.getDate() + 1);
      filter.createdAt = {
        $gte: selectedDate,
        $lt: nextDate
      };
    }

    let sortOption = { createdAt: -1 };
    if (sort === "date-asc") {
      sortOption = { createdAt: 1 };
    } else if (sort === "date-desc") {
      sortOption = { createdAt: -1 };
    } else if (sort === "amount-asc") {
      sortOption = { totalAmount: 1 };
    } else if (sort === "amount-desc") {
      sortOption = { totalAmount: -1 };
    }

    const [orders, totalOrders] = await Promise.all([
      Order.find(filter)
        .populate("user", "name email")
        .sort(sortOption)
        .skip(skip)
        .limit(limit),
      Order.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalOrders / limit);

    res.status(STATUS_CODES.OK).render("orderList", {
      queryValues: req.query,
      orderDetails: orders,
      currentPage: page,
      totalPages,
      limit,
      totalOrders
    });
  } catch (error) {
    console.error("Error while getting orders list", error);
    res.redirect("/pageerror");
  }
};

export const changeOrderStatus = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { status, cancelMessage } = req.body;
    const order = await Order.findOne({ orderId });

    if (!order) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: "Order not found"
      });
    }

    if (order.status === "Cancelled" || order.status === "Returned") {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: "Status cannot be updated"
      });
    }

    if (status === "Processing return" || status === "Returned" || status === "Return rejected") {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: "Forbiden action"
      });
    }

    if (status === "Cancelled" && cancelMessage) {
      order.reasonForCancellation = cancelMessage;
      for (const prod of order.products) {
        await Product.updateOne(
          { _id: prod.product, "variants.size": prod.size },
          { $inc: { "variants.$.stock": prod.quantity } }
        );
      }
    }

    if (status === "Delivered" && order.paymentMethod === "COD") {
      order.paymentStatus = "PAID";
    }

    order.status = status;
    for (let item of order.products) {
      item.status = status;
    }

    await order.save();

    if (order.paymentMethod === "COD" && status == "Delivered") {
      const transactionDetails = await Transaction.findOne({ relatedOrderId: orderId, amount: 200, method: "promo" });
      if (!transactionDetails) {
        const orderCount = await Order.countDocuments({ user: order.user, paymentStatus: "PAID" });
        const userData = await User.findOne({ _id: order.user }, { _id: 0, referedBy: 1 });
        if (orderCount === 1 && userData.referedBy) {
          const refereeDetails = await User.findOne({ email: userData.referedBy });
          const refWallet = await Wallet.findOne({ userId: refereeDetails._id });

          if (!refWallet) {
            let newWallet = new Wallet({
              userId: refereeDetails._id,
              balance: 200
            });
            await newWallet.save();
          } else {
            await Wallet.updateOne({ userId: refereeDetails._id }, { $inc: { balance: 200 } });
          }

          const refTraId = "TRA-" + crypto.randomBytes(4).toString("hex");
          const newRefTransaction = new Transaction({
            userId: refereeDetails._id,
            transactionId: refTraId,
            type: "credit",
            method: "promo",
            amount: 200,
            relatedOrderId: orderId,
            description: "Referal reward"
          });
          await newRefTransaction.save();
        }
      }
    }

    res.status(STATUS_CODES.OK).json({ success: true });
  } catch (error) {
    console.error("Error while changing order status:", error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message
    });
  }
};

export const handlingReturn = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { currentReturnApproval } = req.body;
    const order = await Order.findOne({ orderId }).populate("products.product");

    if (!order) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: "Order not found"
      });
    }

    if (order.status !== "Processing return") {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: "Invalid return state"
      });
    }

    if (currentReturnApproval) {
      const validProducts = order.products.filter((item) => item.status === "Return processing");
      if (validProducts.length === 0) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: "No products found with return processing status"
        });
      }

      for (const prod of order.products) {
        if (prod.status === "Return processing") {
          prod.status = "Returned";
          await Product.updateOne(
            { _id: prod.product, "variants.size": prod.size },
            { $inc: { "variants.$.stock": prod.quantity } }
          );
        }
      }

      const transactionId = "TRA-" + crypto.randomBytes(4).toString("hex");
      const refundAmount = validProducts.reduce(
        (sum, item) => sum + (item.salePrice * item.quantity),
        0
      );

      const walletDetails = await Wallet.findOne({ userId: order.user });
      if (!walletDetails) {
        const newWallet = new Wallet({
          userId: order.user,
          balance: refundAmount
        });
        await newWallet.save();
      } else {
        await Wallet.updateOne(
          { userId: order.user },
          { $inc: { balance: refundAmount } }
        );
      }

      const newTransaction = new Transaction({
        userId: order.user,
        transactionId: transactionId,
        type: "credit",
        method: "refund",
        amount: refundAmount,
        relatedOrderId: orderId,
        description: "Refund for returned product(s)"
      });
      await newTransaction.save();

      order.refundedAmount = (order.refundedAmount || 0) + refundAmount;
      const allReturned = order.products.every(item => item.status === "Returned");
      order.status = allReturned ? "Returned" : "Partially returned";
      await order.save();

      return res.status(STATUS_CODES.OK).json({
        success: true,
        message: "Return approved successfully",
        refundAmount: refundAmount
      });
    } else {
      for (let item of order.products) {
        if (item.status === "Return processing") {
          item.status = "Return rejected";
        }
      }
      order.status = "Return rejected";
      await order.save();
      return res.status(STATUS_CODES.OK).json({
        success: true,
        message: "Return rejected successfully"
      });
    }
  } catch (error) {
    console.error("Error while handling return:", error);
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "An error occurred while processing the return"
    });
  }
};

export const displayOrder = async (req, res) => {
  try {
    const orderId = req.query.orderId;
    const order = await Order.findOne({ orderId })
      .populate("products.product")
      .populate("user", "name email");

    if (!order) return res.redirect("/admin/error");

    const subTotal = order.products.reduce((acc, item) => acc + (item.salePrice * item.quantity), 0);
    const constants = await Constants.find({});
    let shipping = constants[0].shipping;
    let taxes = constants[0].taxes;
    const discount = order.discountValue;
    const total = subTotal + shipping + taxes - discount;

    res.status(STATUS_CODES.OK).render("orderDetailsAdmin", {
      Product: order.products,
      addr: order.address,
      subtotal: subTotal,
      discount,
      shipping,
      taxes,
      total,
      status: order.status,
      orderId: order.orderId,
      customerName: order.user.name,
      customerEmail: order.user.email,
      createdAt: order.createdAt
    });
  } catch (error) {
    console.error("Error while displaying admin order:", error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).redirect("/error");
  }
};

export const handlesingleReturn = async (req, res) => {
  try {
    const productId = new mongoose.Types.ObjectId(req.params.productId);
    const { orderId, size, action } = req.body;

    if (!orderId || !size) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: "Order ID and size are required" });
    }

    if (action === "reject") {
      const rejectResult = await Order.updateOne(
        { orderId, "products.product": productId, "products.size": size },
        { $set: { "products.$.status": "Return rejected", "products.$.returnQuantity": 0 } }
      );
      if (rejectResult.matchedCount === 0) {
        return res.status(STATUS_CODES.NOT_FOUND).json({ success: false, message: "Order or product not found" });
      }
      return res.status(STATUS_CODES.OK).json({ success: true, message: "Return request rejected successfully" });
    }

    const orderDetails = await Order.findOne({ orderId });
    if (!orderDetails) return res.status(STATUS_CODES.NOT_FOUND).json({ success: false, message: "Order not found" });

    if (orderDetails.discountValue && orderDetails.products.length > 1) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: "Return not possible due to coupon in order" });
    }

    const matchedProduct = orderDetails.products.find(p => p.product.equals(productId) && p.size === size);
    if (!matchedProduct) return res.status(STATUS_CODES.NOT_FOUND).json({ success: false, message: "Matching product not found in order" });

    const { quantity, returnQuantity, salePrice } = matchedProduct;
    if (returnQuantity < 0 || returnQuantity > quantity) return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: "Invalid return quantity" });
    if (returnQuantity === 0) return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: "Return quantity cannot be zero" });

    const transactionId = "TRA-" + crypto.randomBytes(4).toString("hex");
    const isFullReturn = returnQuantity === quantity;
    const returnStatus = isFullReturn ? "Returned" : "Partially returned";

    if (isFullReturn) {
      await Order.updateOne({ orderId, "products.product": productId, "products.size": size }, { $set: { "products.$.status": returnStatus } });
    } else {
      await Order.updateOne({ orderId, "products.product": productId, "products.size": size }, { $inc: { "products.$.quantity": -returnQuantity }, $set: { "products.$.status": returnStatus } });
    }

    await Product.updateOne({ _id: productId, "variants.size": size }, { $inc: { "variants.$.stock": returnQuantity } });

    const constants = await Constants.find({});
    let refundAmount = 0;
    if (orderDetails.products.length == 1) {
      refundAmount = orderDetails.totalAmount - (constants[0].shipping + constants[0].taxes);
    } else {
      refundAmount = salePrice * returnQuantity;
      orderDetails.totalAmount -= refundAmount;
    }

    matchedProduct.status = returnStatus;
    orderDetails.status = deriveTotalStatus(orderDetails.products);
    await orderDetails.save();

    await processWalletRefund(orderDetails.user, refundAmount, transactionId, orderId);

    return res.status(STATUS_CODES.OK).json({ success: true, message: isFullReturn ? "Product returned successfully" : "Partial return processed successfully" });
  } catch (error) {
    console.error("Error while handling single return:", error);
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: "An error occurred while processing the return" });
  }
};

const processWalletRefund = async (userId, refundAmount, transactionId, orderId) => {
  const walletDetails = await Wallet.findOne({ userId });
  if (!walletDetails) {
    const newWallet = new Wallet({ userId, balance: refundAmount });
    await newWallet.save();
  } else {
    await Wallet.updateOne({ userId }, { $inc: { balance: refundAmount } });
  }

  const newTransaction = new Transaction({
    userId,
    transactionId,
    type: "credit",
    method: "refund",
    amount: refundAmount,
    relatedOrderId: orderId,
    description: "Refund for returned product"
  });
  await newTransaction.save();
};

export const handleProductStatus = async (req, res) => {
  try {
    const { orderId, productId, size, status } = req.body;
    const order = await Order.findOne({ orderId });
    if (!order) return res.status(STATUS_CODES.NOT_FOUND).json({ success: false, message: "Order not found" });

    const productItem = order.products.find(item => item.product.toString() === productId && item.size === size);
    if (!productItem) return res.status(STATUS_CODES.NOT_FOUND).json({ success: false, message: "Product not found in order" });

    const lockedStatuses = ["Cancelled", "Returned", "Return processing", "Partially returned", "Delivered"];
    if (lockedStatuses.includes(productItem.status)) {
      return res.status(STATUS_CODES.FORBIDDEN).json({ success: false, message: "Cannot update a cancelled or returned item" });
    }

    if (status === "Cancelled") {
      productItem.status = "Cancelled";
      await Product.updateOne({ _id: productId, "variants.size": size }, { $inc: { "variants.$.stock": productItem.quantity } });
    } else if (["Returned", "Return processing", "Return rejected"].includes(status)) {
      return res.status(STATUS_CODES.FORBIDDEN).json({ success: false, message: "Return updates must go through the return portal" });
    } else {
      productItem.status = status;
    }

    order.status = deriveTotalStatus(order.products);
    await order.save();

    return res.status(STATUS_CODES.OK).json({
      success: true,
      message: `Product status updated to ${status}, Order is now ${order.status}`,
      orderStatus: order.status
    });
  } catch (error) {
    console.error("Update Error:", error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: "Internal server error" });
  }
};

function deriveTotalStatus(products) {
  const statuses = products.map(p => p.status);
  if (statuses.every(s => s === "Cancelled")) return "Cancelled";
  if (statuses.every(s => s === "Returned")) return "Returned";
  if (statuses.every(s => s === "Cancelled" || s === "Returned")) return "Returned";

  const activeItems = statuses.filter(s => s !== "Cancelled" && s !== "Returned");
  if (activeItems.length === 0) return "Returned";
  if (activeItems.some(s => s === "Pending")) return "Processing";
  if (activeItems.every(s => s === "Shipped")) return "Shipped";
  if (activeItems.every(s => s === "Delivered")) return "Delivered";

  return "Processing";
}