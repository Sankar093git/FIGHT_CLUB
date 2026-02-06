const User=require("../../models/userSchema");
const Coupon=require("../../models/couponSchema");
const crypto=require("crypto");

const validateCart= async(req,res)=>{
    try {
        const userData =await User.findOne({_id:req.session.user}).populate("cart.product").exec();

        for (const item of userData.cart) {
        const variant = item.product.variants.find(
        v => v.size === item.size
        );

        if (!variant || variant.stock < item.quantity) {
          
           return res.status(400).json({success:false,message:`${item.product.productName} (${item.size}) is out of stock`})
          
         }
        } 
        
        res.status(200).json({success:true});

    } catch (error) {
        console.error("Validate cart: ",error);
        res.staatus(500).json({success:false,message:"Something went wrong"})
    }
}
const loadCheckout= async(req,res)=>{
    try {
        let stockError=null;
        let userName=null;
      if(req.session.google==true){
       const userDetails= await User.findOne({_id:req.session.user});
       userName=userDetails.name;
       }
        let summary={};
        let priceList=[];
        const userData =await User.findOne({_id:req.session.user}).populate("cart.product").exec();
        for (const item of userData.cart) {
        const variant = item.product.variants.find(
        v => v.size === item.size
        );

        if (!variant || variant.stock < item.quantity) {
          
           stockError=`${item.product.productName} (${item.size}) is out of stock`
          
         }
        }
        const validCartItems = userData.cart.filter(item => 
        item.product && item.product.isBlocked === false
       );
        validCartItems.forEach((num)=>{
            if(num.quantity>5){
                num.quantity=5
            }
            priceList.push(num.product.salesPrice*num.quantity);
        });

        const coupons= await Coupon.find();


        summary.subtotal=priceList.reduce((acc,num)=>acc+num,0);
        summary.taxes=50;
        summary.shipping=100;
        summary.total=(summary.subtotal+summary.taxes+summary.shipping);
        console.log(summary);
        const validCoupons=coupons.filter((coupon)=>coupon.minPurchase<=summary.total).map((coupon)=>coupon.code);
        res.status(200).render("checkout",{
            user:req.session.userName||userName,
            image:null,
            addresses:userData.address,
            cartItems:validCartItems,
            summary:summary,
            stockError:stockError,
            coupons:validCoupons
           })
    } catch (error) {
        console.error("Error while loading checkout page",error);
        res.status(500).redirect("/error")
    }
}

const applyCoupon= async(req,res)=>{
  try {
    const taxes=50;
    const shipping=100;
    const couponCode=req.body.couponCode;
    const userId=req.session.user;
    const couponDetails= await Coupon.findOne({code:couponCode});
    const userDetails= await User.findOne({_id:userId}).populate("cart.product");
    console.log("Coupons details:",couponDetails);
    console.log("User details:",userDetails);
    const redeemedCoupons=userDetails.redeemedCoupons;
    const cartDetails=userDetails.cart
    
    const validCartItems=cartDetails.filter(item=>item.product.isBlocked===false)
    if(validCartItems.length===0){
      return res.status(403).json({success:false,message:"One or more product is no longer available"});
    }

    if(redeemedCoupons.includes(couponCode)){
        return res.status(400).json({success:false,message:"This coupon is used up"})
    }

    let totalAmount = validCartItems.reduce((acc, item) => {
    const price = item.product.salesPrice || 0;
    return acc + (price * item.quantity);
  }, 0)+taxes+shipping;
  let discountValue=0;
  if(couponDetails.discountType=="fixed"){
    discountValue=couponDetails.discountValue;
    totalAmount=totalAmount-discountValue;
    await User.updateOne({_id:userId},{$push:{redeemedCoupons:couponCode}});
    return res.status(200).json({success:true,newTotal:totalAmount,discount:discountValue});
  }else if(couponDetails.discountType=="percentage"){
    discountValue=totalAmount*(couponDetails.discountValue/100);
    if(discountValue>couponDetails.maxDiscount){
        discountValue=couponDetails.maxDiscount;
    }
    totalAmount=totalAmount-discountValue;
     await User.updateOne({_id:userId},{$push:{redeemedCoupons:couponCode}});
    return res.status(200).json({success:true,newTotal:totalAmount,discount:discountValue});
  }
  } catch (error) {
    console.error(" Apply coupon:",error);
    res.status(500).json({success:false,message:"Something went wrong!"});
  }
}

const removeCoupon= async(req,res)=>{
    try {
        let {code,totalAmount,discount}=req.body
        totalAmount=Number(totalAmount.replace(/[^\d.]/g, ''));
        discount=Number(discount.replace(/[^\d.]/g, ''))
        const newTotal= totalAmount+discount;
        console.log(newTotal)
        await User.updateOne({_id:req.session.user},{$pull:{redeemedCoupons:code}});
        res.status(200).json({success:true,message:"Coupon removed successfully",newTotal:newTotal,discount:0})
    } catch (error) {
        console.error("Remove coupon : ",error);
        res.status(500).json({success:false,message:"Something went wrong!"});
    }
}


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


module.exports={
    loadCheckout,
    addAddress,
    editAddress,
    applyCoupon,
    validateCart,
    removeCoupon
}