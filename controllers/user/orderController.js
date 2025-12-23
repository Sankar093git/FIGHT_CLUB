const User=require("../../models/userSchema");
const Order=require("../../models/orderSchema");
const crypto=require("crypto");
const Product=require("../../models/productSchema");
const mongoose=require("mongoose");

const loadCheckout= async(req,res)=>{
    try {
        let userName=null;
      if(req.session.google==true){
       const userDetails= await User.findOne({_id:req.session.user});
       userName=userDetails.name;
     }
        let summary={};
        let priceList=[];
        const userData=await User.findOne({_id:req.session.user}).populate("cart.product").exec();
        userData.cart.forEach((num)=>{
            priceList.push(num.product.salesPrice);
        });
        summary.subtotal=priceList.reduce((acc,num)=>acc+num,0);
        summary.discount=200;
        summary.taxes=50;
        summary.shipping=100;
        summary.total=(summary.subtotal+summary.taxes+summary.shipping)-summary.discount;
        res.render("checkout",{
            user:req.session.userName||userName,
            image:null,
            addresses:userData.address,
            cartItems:userData.cart,
            summary:summary,
           })
    } catch (error) {
        console.error("Error while loading checkout page",error);
        res.redirect("/error")
    }
}

const placeOrder = async (req, res) => {
  try {
    const userId = req.session.user;

    const userData = await User.findById(userId).populate("cart.product");

    if (!userData || userData.cart.length === 0) {
      return res.status(400).json({ success: false, message: "Cart is empty" });
    }

    for(let item of userData.cart){
      const variant=item.product.variants.find(v=>v.size===item.size);
      if(!variant||variant.stock===0){
        return res.status(400).json({success:false,message:"Variant not found/Out of stock"})
      }
      if(item.quantity>variant.stock){
        return res.status(400).json({success:false,message:`Only ${variant.stock} units left for${item.product.productName}`})
      }
    }

    const result = await Product.updateOne({_id: item.product._id,"variants.size": item.size,"variants.stock": { $gte: item.quantity }},{ $inc: { "variants.$.stock": -item.quantity }});

   if (result.modifiedCount === 0) {
     return res.status(400).json({
     success: false,
     message: "Stock changed. Please try again."
    });
  }
  const validCartItems=userData.cart.filter(item=>item.product.isBlocked===false)
  if(validCartItems.length===0){{
    return res.status(403).json({success:false,message:"One or more product is no longer available"});
  }}
  const totalAmount= validCartItems.reduce((acc,item)=>acc+item.quantity,0)

    const addressId = req.body.addressId;
    const selectedAddress = userData.address.find(
      addr => addr._id.toString() === addressId
    );

    if (!selectedAddress) {
      return res.status(400).json({ success: false, message: "Invalid address" });
    }

    const orderId = "ORD-" + crypto.randomBytes(4).toString("hex");

    const newOrder = new Order({
      user: userId,
      orderId: orderId,
      products:  validCartItems,
      address: selectedAddress,
      totalAmount: totalAmount,
      status: "Pending"
    });

    await newOrder.save();

    await User.updateOne({ _id: userId },{ $set: { cart: [] } });

    res.status(201).json({success: true, orderId: orderId});

  } catch (error) {
    console.error("Error while placing order:", error);
    res.status(500).json({success: false,message: "Failed to place order"});
  }
};


const orderSuccess= async (req,res)=>{
    try {
        res.render("orderPlaced");
    } catch (error) {
        console.error("Error while loading success page :",error);
        res.redirect("/error");
    }
}

const cancelOrder = async (req, res) => {
  try {
    const userId = req.session.user;
    const orderId = req.params.id;

    const order = await Order.findOne({
      orderId: orderId,
      user: userId
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    if (order.status === "Delivered") {
      return res.status(400).json({
        success: false,
        message: "Delivered orders cannot be cancelled"
      });
    }

    order.status = "Cancelled";
    await order.save();

    for (const prod of order.products) {
      await Product.updateOne({_id: prod.product, "variants.size": prod.size},{$inc: { "variants.$.stock": prod.quantity }});
    }

    res.json({ success: true });

  } catch (error) {
    console.error("Error while cancelling order:", error);
    res.status(500).json({ success: false });
  }
};

const returnOrder = async (req, res) => {
  try {
    const userId = req.session.user;
    const orderId = req.params.id;
    const returnMessage = req.body.message;

    // Find the order belonging to the user
    const order = await Order.findOne({
      orderId: orderId,
      user: userId
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    // Allow return only for delivered orders
    if (order.status !== "Delivered") {
      return res.status(400).json({
        success: false,
        message: "Only delivered orders can be returned"
      });
    }

    // Update order status & reason
    order.status = "Processing return";
    order.reasonForReturn = returnMessage;
    await order.save();

    res.json({
      success: true,
      message: "Return request submitted",
      reason: returnMessage
    });

  } catch (error) {
    console.error("Error while returning order:", error);
    res.status(500).json({ success: false });
  }
};

const displayOrder = async (req, res) => {
  try {
    const userId = req.session.user;
    const orderId = req.query.id;

    //  Find order belonging to the logged-in user
    const order = await Order.findOne({
      orderId: orderId,
      user: userId
    }).populate("products.product");

    if (!order) {
      return res.redirect("/404");
    }

    //  Calculate subtotal
    const subTotal = order.products.reduce((acc, item) => {
      return acc + (item.product.salesPrice * item.quantity);
    }, 0);

    //  Pricing (same logic as before)
    const shipping = 100;
    const taxes = 50;
    const discount = 200;
    const total = subTotal + shipping + taxes - discount;

    //  Render order details page
    res.render("orderDetails", {
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
    res.redirect("/error");
  }
};




const addAddress= async (req,res)=>{
    try {
        await User.updateOne({_id:req.session.user},{$addToSet:{address:req.body}});
        res.redirect("/checkout");

    } catch (error) {
        console.error("Error while adding address",error);
        res.redirect("/error");
    }
}

const editAddress= async(req,res)=>{
    try {
        const addressId=req.params.id;
        const { label, street, city, state, country, postalCode, phone, isDefault } = req.body;

        await User.updateOne({_id:req.session.user,"address._id":addressId},{$set:{
            "address.$.label":label,
            "address.$.street": street,
            "address.$.city": city,
            "address.$.state": state,
            "address.$.country": country,
            "address.$.postalCode": postalCode,
            "address.$.phone": phone,
            "address.$.isDefault":isDefault
        }});
        res.redirect("/checkout");
    } catch (error) {
        console.error("Error while editing address : ",error);
        res.redirect("/error");
    }
}

const singleCancel=async(req,res)=>{
  try {
     const productId = new mongoose.Types.ObjectId(req.params.productId);
    const {id,size,value,quantity}=req.body;
    console.log(req.body);
    console.log(id)
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
    console.log("Error while returning single product",error.message);
    res.status(500).json({success:true,message:"Something went wrong!"})
  }
 }

 const singleReturn = async(req,res)=>{
  try {
    const productId=req.params.productId;
    const {id,size,value}=req.body;
    if(value){
      await Order.updateOne({orderId:id,"products.product":productId,"products.size": size},{$set:{"products.$.status":"Return processing(P)","products.$.returnQuantity":value}});
      return res.status(200).json({success:true, message:"Refund request has been sumbitted"});
    }else{
      await Order.updateOne({orderId:id, "products.product":productId,"products.size": size},{$set:{"products.$.status":"Return processing"}});
      return res.status(200).json({success:true, message:"Your refund shall be processed"});
    }
  } catch (error) {
    console.error("Error while returning a single product",error.message);
    res.status(500).json({success:true,message:error.message});
  }
 }

module.exports={
    loadCheckout,
    displayOrder,
    cancelOrder,
    returnOrder,
    placeOrder,
    editAddress,
    addAddress,
    orderSuccess,
    singleCancel,
    singleReturn
}