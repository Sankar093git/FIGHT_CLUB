const User=require("../../models/userSchema");
const Order=require("../../models/orderSchema");
const crypto=require("crypto");
const Product=require("../../models/productSchema");
const Coupon=require("../../models/couponSchema");
const Wallet=require("../../models/walletShema");
const mongoose=require("mongoose");
const paymentController=require("../../controllers/user/paymentController");
const Transactions=require("../../models/transactionSchema");

const placeOrder = async (req, res) => {
  try {
    const userId = req.session.user;
    const taxes=50;
    const shipping=100;
    const {
      paymentMethod
      ,couponCode
    } = req.body;

    console.log(couponCode);

    const userData = await User.findById(userId).populate("cart.product");

    if (!userData || userData.cart.length === 0) {
      return res.status(400).json({ success: false, message: "Cart is empty" });
    }
//Stock validation
    for(let x of userData.cart){
      const variant=x.product.variants.find(v=>v.size===x.size);
      if(!variant||variant.stock===0){
        return res.status(400).json({success:false,message:`Variant not found for ${x.product.productName}/Out of stock`})
      }
      if(x.quantity>variant.stock){
        return res.status(400).json({success:false,message:`Only ${variant.stock} units left for${x.product.productName}`})
      }
    }


    const validCartItems=userData.cart.filter(item=>item.product.isBlocked===false)
    if(validCartItems.length===0){
      return res.status(403).json({success:false,message:"One or more product is no longer available"});
    }

    let totalAmount = validCartItems.reduce((acc, item) => {
    const price = item.product.salesPrice || 0;
    return acc + (price * item.quantity)
  }, 0)+shipping+taxes;
   console.log(totalAmount);
   let discountValue=0;
   if(couponCode){
      const couponDetails = await Coupon.findOne({code:couponCode});
      if(couponDetails.discountType=="fixed"){
        discountValue=couponDetails.discountValue;
        totalAmount=totalAmount-discountValue;
        console.log("discount value",discountValue);
      }else if(couponDetails.discountType=="percentage"){
        discountValue=totalAmount*(couponDetails.discountValue/100);
        totalAmount=totalAmount-discountValue;
      }
    }
    console.log(totalAmount);
    const addressId = req.body.addressId;
    const selectedAddress = userData.address.find(
      addr => addr._id.toString() === addressId
    );

    if (!selectedAddress) {
      return res.status(400).json({ success: false, message: "Invalid address" });
    }

   const orderId = "ORD-" + crypto.randomBytes(4).toString("hex");

   if(paymentMethod=="COD"){// Stock will be deducted only if the payment method is COD
       for (let x of userData.cart) {
   const result=await Product.updateOne(
        { _id: x.product._id, "variants.size": x.size },
        { $inc: { "variants.$.stock": -x.quantity } }
    );

    if (result.modifiedCount === 0) {
     return res.status(400).json({
     success: false,
     message: "Stock changed. Please try again."
    });
   }
    }
   }
    const newOrder = new Order({
      user: userId,
      orderId: orderId,
      products:  validCartItems,
      address: selectedAddress,
      totalAmount: totalAmount,
      discountValue:discountValue,
      paymentMethod: paymentMethod,
      paymentStatus: "PENDING",
      status: "Pending"
    });
  
    await newOrder.save();

    await User.updateOne({ _id: userId },{ $set: { cart: [] } }); //Emptying cart after order placement.

    res.status(201).json({success: true, orderId: orderId});

  } catch (error) {
    console.error("Error while placing order:", error);
    res.status(500).json({success: false,message: "Failed to place order"});
  }
};


const orderSuccess= async (req,res)=>{
    try {
        res.status(200).render("orderPlaced");
    } catch (error) {
        console.error("Error while loading success page :",error);
        res.status(500).redirect("/error");
    }
}

const paymentFailure= async(req,res)=>{
  try {
    const orderId=req.query.orderId;
    const userDetails= await User.findOne({_id:req.session.user});
    await Order.updateOne({orderId:orderId},{$inc:{retryCount:1}});
    res.status(400).render("orderFailed",{
      orderId:orderId,
      user:userDetails
    });
  } catch (error) {
    console.error("Payment failure page:",error);
    res.status(500).redirect("/error")
  }
}

const updatePayment=async(req,res)=>{
  try {
    console.log("payment updation is triggering!");
    const {razorpay_order_id,razorpay_payment_id,razorpay_signature}=req.body;
    const orderId=req.params.orderId;
    const orderDetails= await Order.findOne({orderId:orderId});
    if(!orderDetails){
     return res.status(400).json({success:false,message:"Order not found"});
    }
    if(orderDetails.paymentStatus=="PAID"){
      return res.status(400).json({success:false,message:"Payment already done"})
    }
    let isPaid = await paymentController.verifyPayment({
                         razorpay_order_id,
                         razorpay_payment_id,
                         razorpay_signature: razorpay_signature
                        });
    if (!isPaid) {
      return res.status(400).json({ success: false, message: "Payment verification failed" });
     }
    
     orderDetails.paymentStatus=isPaid==true?"PAID":"PENDING"
     orderDetails.razorpay= {
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id
      },

      await orderDetails.save();
      for(let item of orderDetails.products){
         const id=item.product._id;
         const size=item.size;
         const quantity=item.quantity;
         await Product.updateOne({_id:id,"variants.size":size,"variants.stock": { $gte: quantity }},{$inc:{"variants.$.stock":-quantity}});
      }
      console.log("Payment verified and stock updated");
     return res.status(200).json({
      success: true,
      message: "Payment verified and stock updated",
      orderId: orderDetails.orderId
     });


  } catch (error) {
    console.error("Payment updation:",error);
    res.status(500).json({success:false, message:'Something went wrong!'});
  }
}

const cancelOrder = async (req, res) => {
  try {
    const userId = req.session.user;
    const orderId = req.params.id;
    const cancelMessage=req.body.message;

    const order = await Order.findOne({
      orderId: orderId,
      user: userId
    }).populate("products.product")

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

    if (["Cancelled", "Partially cancelled"].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: "Order is already cancelled"
      });
    }
    const validProducts=order.products.filter((prod)=>prod.status=="Pending");
    const refundAmount=validProducts.map((prod)=>prod.quantity*prod.product.salesPrice).reduce((acc,num)=>acc+num,0)-(Math.floor(order.discountValue/order.products.length));

    order.products.forEach(prod => {
      if(!["Returned","Delivered","Cancelled","Return Processing","Shipped","Return rejected"].includes(prod.status)){
        prod.status = "Cancelled";
      }
    });

    let statuses=order.products.map((p)=>p.status);

    if(statuses.every((s)=>s==="Cancelled")){
      order.status = "Cancelled";
    }else{
      order.status = "Partially cancelled";
    }
    order.reasonForCancellation=cancelMessage;
    await order.save(); 
// Wallet-logic
    const transactionId = "TRA-" + crypto.randomBytes(4).toString("hex");
     if(order.paymentStatus=="PAID" && refundAmount > 0){
      let newTransaction= new Transactions({
        userId:userId,
        transactionId:transactionId,
        type:"credit",
        method:"refund",
        amount:refundAmount,
        relatedOrderId:orderId,
        description:cancelMessage
      })

      await newTransaction.save();

    const walletDetails= await Wallet.findOne({userId:req.session.user});
    if(!walletDetails){
      let newWallet = new Wallet({
        userId:req.session.user,
        balance:refundAmount,
      })
      await newWallet.save();
    }else{
      await Wallet.updateOne({userId:req.session.user},{$inc:{balance:refundAmount}})
    }
  }
// Wallet logic ends here
    for (const prod of validProducts) {
      await Product.updateOne(
        { _id: prod.product, "variants.size": prod.size },
        { $inc: { "variants.$.stock": prod.quantity } }
      );
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

    if (order.status !== "Delivered") {
      return res.status(400).json({
        success: false,
        message: "Only delivered orders can be returned"
      });
    }

    order.products.forEach(prod => {
      if(!["Returned","Cancelled","Return Processing","Shipped","Return rejected"].includes(prod.status)){
      prod.status = "Return processing";
      }
    });

    order.status = "Processing return";
    order.reasonForReturn = returnMessage;
    
    await order.save();

    res.status(200).json({
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
      return res.redirect("/error");
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
    res.status(200).render("orderDetails", {
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
    res.status(500).redirect("/error");
  }
};




const addAddress= async (req,res)=>{
    try {
        await User.updateOne({_id:req.session.user},{$addToSet:{address:req.body}});
        res.status(200).redirect("/checkout");

    } catch (error) {
        console.error("Error while adding address",error);
        res.status(500).redirect("/error");
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
        res.status(200).redirect("/checkout");
    } catch (error) {
        console.error("Error while editing address : ",error);
        res.status(500).redirect("/error");
    }
}

const singleCancel = async (req, res) => {
  try {
    const productId = new mongoose.Types.ObjectId(req.params.productId);
    const { id, size, value, quantity } = req.body;

    //Fetch product safely
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    //Prepare update logic
    let orderUpdate;
    let stockToRestore;

    if (value) {
      //Partial Cancellation
      orderUpdate = {
        $inc: { "products.$[item].quantity": -value },
        $set: { "products.$[item].status": "Partially cancelled" }
      };
      stockToRestore = value;
    } else {
      //Full Cancellation
      orderUpdate = {
        $set: { "products.$[item].status": "Cancelled" }
      };
      stockToRestore = quantity;
    }

    //Update Order using arrayFilters (The fix)
    const orderResult = await Order.updateOne(
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
    const orderDetails=await Order.findOne({orderId:id});
    let refundAmount=0
    if(value){
      refundAmount=product.salesPrice*value-Math.floor(orderDetails.discountValue/orderDetails.products.length);
    }else{
      refundAmount=product.salesPrice*quantity-Math.floor(orderDetails.discountValue/orderDetails.products.length)
    }
    const products=orderDetails.products;
    const totalStatus=deriveTotalStatus(products);
    orderDetails.status= totalStatus
    orderDetails.totalAmount-=refundAmount;
    await orderDetails.save();
    //Refunding/wallet updation
    const transactionId = "TRA-" + crypto.randomBytes(4).toString("hex");
    
    const walletDetails= await Wallet.findOne({userId:req.session.user});
    if(!walletDetails){
      const newWallet= new Wallet({
        userId:req.session.user,
        balance:refundAmount
      });
      await newWallet.save();
    }else{
      await Wallet.updateOne({userId:req.session.user},{$inc:{balance:refundAmount}});
    }
    const newTransaction= new Transactions({
      userId:req.session.user,
      transactionId:transactionId,
      type:"credit",
      method:"refund",
      amount:refundAmount,
      relatedOrderId:id,
      description:"Cancel message"
    });
    await newTransaction.save();
    //Refunding/wallet updation ends here
    
    //Update Product Stock
    await Product.updateOne(
      { _id: productId, "variants.size": size },
      { $inc: { "variants.$.stock": stockToRestore } }
    );

    return res.status(200).json({ 
      success: true, 
      message: `Cancellation for ${product.productName} processed.` 
    });

  } catch (error) {
    console.error("Error while canceling product:", error.message);
    res.status(500).json({ success: false, message: "Something went wrong!" });
  }
};

 const singleReturn = async (req, res) => {
  try {
    const productId = new mongoose.Types.ObjectId(req.params.productId);
    const { id, size, value } = req.body;

    // 1. Fetch product safely to get the name for the logs/response
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const productName = product.productName;
    console.log("Processing return for:", productName, "Size:", size);

    // 2. Prepare the update object
    const updateFields = value 
      ? { 
          "products.$[elem].status": "Return processing(P)", 
          "products.$[elem].returnQuantity": value 
        }
      : { 
          "products.$[elem].status": "Return processing" 
        };

    // 3. Perform the update using arrayFilters
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
      return res.status(404).json({ success: false, message: "Order or Item matching size not found" });
    }

    const responseMsg = value 
      ? "Refund request has been submitted" 
      : "Your refund shall be processed";

    const orderDetails=await Order.findOne({orderId:id});
    const products=orderDetails.products;
    const totalStatus=deriveTotalStatus(products);
    orderDetails.status= totalStatus
    await orderDetails.save();

    return res.status(200).json({ success: true, message: responseMsg });

  } catch (error) {
    console.error("Error while returning a single product:", error.message);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

function deriveTotalStatus(products) {
  console.log("Function is working")
  const statuses = products.map(p => p.status);

  if (statuses.every(s => s === "Cancelled")) return "Cancelled";
  
  const activeItems = statuses.filter(s => s !== "Cancelled" && s !== "Returned");

  if (activeItems.some(s => s === "Pending")) return "Processing";
  if (activeItems.every(s => s === "Shipped")) return "Shipped";
  if (activeItems.every(s => s === "Out for delivery")) return "Out for delivery";
  if (activeItems.every(s => s === "Delivered")) return "Delivered";
  if (activeItems.every(s => s === "Returned")) return "Returned";
  if (activeItems.every(s => s === "Return processing")) return "Processing return";

  return "Processing";
}

module.exports={
    displayOrder,
    cancelOrder,
    returnOrder,
    placeOrder,
    editAddress,
    addAddress,
    orderSuccess,
    singleCancel,
    singleReturn,
    paymentFailure,
    updatePayment,
}