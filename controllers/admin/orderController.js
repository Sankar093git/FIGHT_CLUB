const User=require("../../models/userSchema");
const Product=require("../../models/productSchema");
const Order=require("../../models/orderSchema");

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

    console.log(orders);

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
    await order.save();

    res.json({ success: true });

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
        await Product.updateOne(
          { _id: prod.product, "variants.size": prod.size },
          { $inc: { "variants.$.stock": prod.quantity } }
        );
      }

      order.status = "Returned";
      await order.save();

      return res.json({
        success: true,
        message: "Return approved successfully"
      });
    }else {
      order.status = "Return rejected";
      await order.save();

      return res.json({
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
      return res.redirect("/404");
    }

    const subTotal = order.products.reduce((acc, item) => {
      return acc + (item.product.salesPrice * item.quantity);
    }, 0);

    const shipping = 100;
    const taxes = 50;
    const discount = 200;
    const total = subTotal + shipping + taxes - discount;

    res.render("orderDetailsAdmin", {
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
    res.redirect("/error");
  }
};
 const singleCancel=async(req,res)=>{
  try {
    const productId=req.params.productId;
    const {id,size,value,quantity}=req.body;
    if(value){
      await Order.updateOne({orderId:id,"products.product":productId,"products.size": size},{$inc:{"products.$.quantity":-value},$set:{"products.$.status":"Partially cancelled"}});

      await Product.updateOne({_id:productId,"variants.size":size},{$inc:{"variants.$.stock":value}});
      return res.status(200).json({success:true, message:"Your amount shall be refunded"});
    }else{
      await Order.updateOne({orderId:id, "products.product":productId,"products.size": size},{$set:{"products.$.status":"Cancelled"}});

      await Product.updateOne({_id:productId,"variants.size":size},{$inc:{"variants.$.stock":quantity}});
      return res.status(200).json({success:true, message:"Your amount shall be refunded"});
    }
  } catch (error) {
    console.log("Error while returning single product");
    res.status(500).json({success:true,message:"Something went wrong!"})
  }
 }

 const singleReturn = async(req,res)=>{
  try {
    const productId=req.params.productId;
    const {id,size,value,quantity}=req.body;
    if(value){
      await Order.updateOne({orderId:id,"products.product":productId,"products.size": size},{$set:{"products.$.status":"Return processing(P)","products.$.returnQuantity":value}});
      return res.status(200).json({success:true, message:"Refund request has been sumbitted"});
    }else{
      await Order.updateOne({orderId:id, "products.product":productId,"products.size": size},{$set:{"products.$.status":"Return processing"}});
      return res.status(200).json({success:true, message:"Your refund shall be processed"});
    }
  } catch (error) {
    console.error("Error while returning a single product",error);
    res.status(500).json({success:true,message:error.message});
  }
 }


module.exports={
    getOrderList,
    changeOrderStatus,
    handlingReturn,
    displayOrder,
    singleCancel,
    singleReturn
}