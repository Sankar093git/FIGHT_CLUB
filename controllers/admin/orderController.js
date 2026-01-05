const User=require("../../models/userSchema");
const Product=require("../../models/productSchema");
const Order=require("../../models/orderSchema");
const mongoose=require("mongoose");

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

    const order = await Order.findOne({ orderId });

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

      for (const prod of order.products) {
         if(prod.status=="Return processing"){
          prod.status="Returned";
          await Product.updateOne(
          { _id: prod.product, "variants.size": prod.size },
          { $inc: { "variants.$.stock": prod.quantity } }
        );
        }
      }

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
};

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
      return acc + (item.product.salesPrice * item.quantity);
    }, 0);

    const shipping = 100;
    const taxes = 50;
    const discount = 200;
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
    console.log(orderId);

    //action=reject
    if (!action) {
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

   //action=approve
    const orderDetails = await Order.findOne({
      orderId
    });

    console.log(orderDetails);

    if (!orderDetails) {
      return res.status(404).json({
        success: false,
        message: "Order or product not found"
      });
    }

    const matchedProduct = orderDetails.products.find(
      p => p.product.equals(productId) && p.size === size
    );

    if (!matchedProduct) {
      return res.status(404).json({
        success: false,
        message: "Matching product not found in order"
      });
    }

    const { quantity, returnQuantity } = matchedProduct;

    if (returnQuantity < 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid return quantity"
      });
    }

    //full return
    if (returnQuantity === 0) {
      await Order.updateOne(
        {
          orderId,
          "products.product": productId,
          "products.size": size
        },
        {
          $set: {
            "products.$.status": "Returned",
          }
        }
      );

      await Product.updateOne(
        { _id: productId, "variants.size": size },
        { $inc: { "variants.$.stock": quantity } }
      );

      return res.status(200).json({
        success: true,
        message: "Product returned successfully"
      });
    }

    //partial return
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
          "products.$.status": "Partially returned",
        }
      }
    );

    await Product.updateOne(
      { _id: productId, "variants.size": size },
      { $inc: { "variants.$.stock": returnQuantity } }
    );

    return res.status(200).json({
      success: true,
      message: "Partial return processed successfully"
    });

  } catch (error) {
    console.error("Error while handling single return:", error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
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