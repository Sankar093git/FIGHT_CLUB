const User=require("../../models/userSchema");
const crypto=require("crypto");
const loadCheckout= async(req,res)=>{
    try {
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
        console.log(summary);
        res.render("checkout",{
            addresses:userData.address,
            cartItems:userData.cart,
            summary:summary,
           })
    } catch (error) {
        console.error("Error while loading checkout page",error);
        res.redirect("/error")
    }
}

const placeOrder= async (req,res)=>{
    try {
        const userData=await User.findOne({_id:req.session.user});
        const address=req.body.addressId;
        const selectedAddress=userData.address.find((addr)=>addr._id.toString()==address);
        const orderId = "ORD-" + crypto.randomBytes(4).toString("hex");
        const newOrder={
        name:userData.name,
        email:userData.email,    
        orderId:orderId ,
        products: userData.cart,
        totalAmount:parseFloat(req.body.totalAmount),
        address:selectedAddress,
        status: "Pending"
        }
        await User.updateOne({_id:req.session.user},{$push:{orders:newOrder},$set:{cart:[]}});
        res.status(201).json({success:true,orderId:orderId});
    } catch (error) {
        console.log("Error while placeing order",error);
        res.status(201).json({success:false,message:"Failed"})
        res.redirect("/error");
    }
}

const orderSuccess= async (req,res)=>{
    try {
        res.render("orderPlaced");
    } catch (error) {
        console.error("Error while loading success page :",error);
        res.redirect("/error");
    }
}

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



module.exports={
    loadCheckout,
    placeOrder,
    orderSuccess,
    addAddress,
    editAddress
}