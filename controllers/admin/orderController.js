const User=require("../../models/userSchema");
const Product=require("../../models/productSchema");
const Order=require("../../models/orderSchema");
const mongoose=require("mongoose");
const Wallet=require("../../models/walletShema");
const Transaction=require("../../models/transactionSchema");
const crypto=require("crypto");

const getOrderList = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 4;
    const skip = (page - 1) * limit;

    const { search, status, sort, date } = req.query;

    // Build base filter
    let filter = {};

    // Search filter
    if (search) {
      if (/^ORD-[A-Fa-f0-9]{8}$/.test(search)) {
        filter.orderId = search;
      } else if (/^[A-Za-z][A-Za-z ]{1,50}$/.test(search)) {
        filter.customerName = { $regex: search, $options: "i" };
      } else if (/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(search)) {
        filter.customerEmail = search;
      }
    }

    // Status filter
    if (status && status !== "") {
      filter.status = status;
    }

    // Date filter
    if (date) {
      const selectedDate = new Date(date);
      const nextDate = new Date(selectedDate);
      nextDate.setDate(selectedDate.getDate() + 1);

      filter.createdAt = {
        $gte: selectedDate,
        $lt: nextDate
      };
    }

    // Sorting
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

    // Query orders
    const [orders, totalOrders] = await Promise.all([
      Order.find(filter)
        .populate("user", "name email")
        .sort(sortOption)
        .skip(skip)
        .limit(limit),
      Order.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalOrders / limit);

    res.render("orderList", {
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


const changeOrderStatus = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { status, cancelMessage } = req.body;

    const order = await Order.findOne({ orderId });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    if(order.status==="Cancelled"||order.status==="Returned"){
      return res.status(404).json({
        success: false,
        message: "Status cannot be updated"
      });
    }

    if(status==="Processing return"||status==="Returned"||status==="Return rejected"){
      return res.status(404).json({
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
    order.status = status;
    for(let item of order.products){
      item.status=status
    }
    await order.save();


    res.status(200).json({ success: true });

  } catch (error) {
    console.error("Error while changing order status:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const handlingReturn = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { currentReturnApproval } = req.body;

    const order = await Order.findOne({ orderId }).populate("products.product");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    if (order.status !== "Processing return") {
      return res.status(400).json({
        success: false,
        message: "Invalid return state"
      });
    }

    if (currentReturnApproval) {
      const validProducts = order.products.filter((item) => item.status === "Return processing");
      
      if (validProducts.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No products found with return processing status"
        });
      }

      // Update product statuses and restore stock
      for (const prod of order.products) {
        if (prod.status === "Return processing") {
          prod.status = "Returned";
          await Product.updateOne(
            { _id: prod.product, "variants.size": prod.size },
            { $inc: { "variants.$.stock": prod.quantity } }
          );
        }
      }

      // Calculate refund amount
      const transactionId = "TRA-" + crypto.randomBytes(4).toString("hex");
      const refundAmount = validProducts.reduce(
        (sum, item) => sum + (item.salePrice * item.quantity), 
        0
      );

      // Update wallet
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

      // Create transaction record
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

      // Track refund separately (preserves original totalAmount for analytics)
      order.refundedAmount = (order.refundedAmount || 0) + refundAmount;

      // Determine final order status
      const allReturned = order.products.every(item => item.status === "Returned");
      order.status = allReturned ? "Returned" : "Partially returned";
      
      await order.save();

      return res.json({
        success: true,
        message: "Return approved successfully",
        refundAmount: refundAmount
      });

    } else {
      // Rejection flow
      for (let item of order.products) {
        if (item.status === "Return processing") {
          item.status = "Return rejected";
        }
      }
      order.status = "Return rejected";
      await order.save();

      return res.status(200).json({
        success: true,
        message: "Return rejected successfully"
      });
    }

  } catch (error) {
    console.error("Error while handling return:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while processing the return"
    });
  }
};

 /*const handlingReturn = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { currentReturnApproval } = req.body;

    const order = await Order.findOne({ orderId }).populate("products.product");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    if (order.status !== "Processing return") {
      return res.status(400).json({
        success: false,
        message: "Invalid return state"
      });
    }

    if (currentReturnApproval) {
      const validProducts=order.products.filter((item)=>item.status=="Return processing");
      for (const prod of order.products) {
         if(prod.status=="Return processing"){
          prod.status="Returned";
          await Product.updateOne(
          { _id: prod.product, "variants.size": prod.size },
          { $inc: { "variants.$.stock": prod.quantity } }
        );
        }
      }
      //Wallet updation / refund logic
      const transactionId = "TRA-" + crypto.randomBytes(4).toString("hex");
      const refundArray=validProducts.map((item)=>item.salePrice*item.quantity);
      console.log(refundArray);
      const totalSalesPrice=refundArray.reduce((acc,num)=>acc+num,0);
      const refundAmount=totalSalesPrice
      console.log(refundAmount)
      const walletDetails= await Wallet.findOne({userId:order.user});
      if(!walletDetails){
        const newWallet= new Wallet({
          userId:order.user,
          balance:refundAmount
        });
        await newWallet.save();
      }else{
        await Wallet.updateOne({userId:order.user},{$inc:{balance:refundAmount}});
      }
      const newTransaction= new Transaction({
      userId:order.user,
      transactionId:transactionId,
      type:"credit",
      method:"refund",
      amount:refundAmount,
      relatedOrderId:orderId,
      description:"return message"
    });
    await newTransaction.save();
      //Wallet updation/ refund logic ends here
      order.status = "Returned";
      await order.save();

      return res.json({
        success: true,
        message: "Return approved successfully"
      });
    }else {
      for(let item of order.products){
        if(item.status=="Return processing"){
          item.status="Return rejected"
        }
      }
      order.status = "Return rejected";
      await order.save();

      return res.status(200).json({
        success: true,
        message: "Return rejected successfully"
      });
    }

  } catch (error) {
    console.error("Error while handling return:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};*/

 const displayOrder = async (req, res) => {
  try {
    const orderId = req.query.orderId;

    const order = await Order.findOne({ orderId })
      .populate("products.product")
      .populate("user", "name email");

    if (!order) {
      return res.redirect("/admin/error");
    }

    const subTotal = order.products.reduce((acc, item) => {
      return acc + (item.salePrice * item.quantity);
    }, 0);

    const shipping = 100;
    const taxes = 50;
    const discount=order.discountValue;
    const total = subTotal + shipping + taxes - discount;

    res.status(200).render("orderDetailsAdmin", {
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
    res.status(500).redirect("/error");
  }
};

const handlesingleReturn = async (req, res) => {
  try {
    const productId = new mongoose.Types.ObjectId(req.params.productId);
    const { orderId, size, action } = req.body;

    // Validate required fields
    if (!orderId || !size) {
      return res.status(400).json({
        success: false,
        message: "Order ID and size are required"
      });
    }

    // ACTION: REJECT
    if (action === "reject") {
      const rejectResult = await Order.updateOne(
        {
          orderId,
          "products.product": productId,
          "products.size": size
        },
        {
          $set: {
            "products.$.status": "Return rejected",
            "products.$.returnQuantity": 0
          }
        }
      );

      if (rejectResult.matchedCount === 0) {
        return res.status(404).json({
          success: false,
          message: "Order or product not found"
        });
      }

      return res.status(200).json({
        success: true,
        message: "Return request rejected successfully"
      });
    }

    // ACTION: APPROVE (default when action is not "reject")
    const orderDetails = await Order.findOne({ orderId });

    if (!orderDetails) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    // Check if order has discount/coupon applied
    if (orderDetails.discountValue&&orderDetails.products.length>1) {
      return res.status(400).json({
        success: false,
        message: "Return not possible due to coupon in order"
      });
    }

    // Find the matching product in the order
    const matchedProduct = orderDetails.products.find(
      p => p.product.equals(productId) && p.size === size
    );

    if (!matchedProduct) {
      return res.status(404).json({
        success: false,
        message: "Matching product not found in order"
      });
    }

    const { quantity, returnQuantity, salePrice } = matchedProduct;

    // Validate return quantity
    if (returnQuantity < 0 || returnQuantity > quantity) {
      return res.status(400).json({
        success: false,
        message: "Invalid return quantity"
      });
    }

    if (returnQuantity === 0) {
      return res.status(400).json({
        success: false,
        message: "Return quantity cannot be zero"
      });
    }

    // Generate transaction ID
    const transactionId = "TRA-" + crypto.randomBytes(4).toString("hex");

    // Determine if full or partial return
    const isFullReturn = returnQuantity === quantity;
    const returnStatus = isFullReturn ? "Returned" : "Partially returned";

    // Update order status
    if (isFullReturn) {
      await Order.updateOne(
        {
          orderId,
          "products.product": productId,
          "products.size": size
        },
        {
          $set: {
            "products.$.status": returnStatus
          }
        }
      );
    } else {
      await Order.updateOne(
        {
          orderId,
          "products.product": productId,
          "products.size": size
        },
        {
          $inc: {
            "products.$.quantity": -returnQuantity
          },
          $set: {
            "products.$.status": returnStatus
          }
        }
      );
    }

    // Update product stock
    await Product.updateOne(
      { _id: productId, "variants.size": size },
      { $inc: { "variants.$.stock": returnQuantity } }
    );

    // Calculate refund amount
    let refundAmount=0;
    if(orderDetails.products.length==1){
      refundAmount=orderDetails.totalAmount;
    }else{
     refundAmount = salePrice * returnQuantity;
     orderDetails.totalAmount -= refundAmount;
    }
    await orderDetails.save();

    // Process wallet refund
    await processWalletRefund(
      orderDetails.user,
      refundAmount,
      transactionId,
      orderId
    );

    return res.status(200).json({
      success: true,
      message: isFullReturn 
        ? "Product returned successfully" 
        : "Partial return processed successfully"
    });

  } catch (error) {
    console.error("Error while handling single return:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while processing the return"
    });
  }
};

// Helper function to handle wallet refund and transaction creation
const processWalletRefund = async (userId, refundAmount, transactionId, orderId) => {
  // Check if wallet exists
  const walletDetails = await Wallet.findOne({ userId });

  if (!walletDetails) {
    // Create new wallet if it doesn't exist
    const newWallet = new Wallet({
      userId,
      balance: refundAmount
    });
    await newWallet.save();
  } else {
    // Update existing wallet
    await Wallet.updateOne(
      { userId },
      { $inc: { balance: refundAmount } }
    );
  }

  // Create transaction record
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

const handleProductStatus = async (req, res) => {
  try {
    const { orderId, productId, size, status } = req.body;

    const order = await Order.findOne({ orderId });

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const productItem = order.products.find(
      item => item.product.toString() === productId && item.size === size
    );

    if (!productItem) {
      return res.status(404).json({ success: false, message: "Product not found in order" });
    }

    const lockedStatuses = ["Cancelled", "Returned", "Return processing","Partially returned","Delivered"];
    if (lockedStatuses.includes(productItem.status)) {
      return res.status(403).json({ success: false, message: "Cannot update a cancelled or returned item" });
    }

    if (status === "Cancelled") {
      productItem.status = "Cancelled"; 

      await Product.updateOne(
        { _id: productId, "variants.size": size },
        { $inc: { "variants.$.stock": productItem.quantity } }
      );
    } 
    else if (["Returned", "Return processing", "Return rejected"].includes(status)) {
      return res.status(403).json({ success: false, message: "Return updates must go through the return portal" });
    } 
    else {
      productItem.status = status;
    }

    order.status = deriveTotalStatus(order.products);

    await order.save();

    return res.status(200).json({
      success: true,
      message: `Product status updated to ${status}, Order is now ${order.status}`,
      orderStatus: order.status
    });

  } catch (error) {
    console.error("Update Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
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

  return "Processing";
}


module.exports={
    getOrderList,
    changeOrderStatus,
    handlingReturn,
    displayOrder,
    handlesingleReturn,
    handleProductStatus
}