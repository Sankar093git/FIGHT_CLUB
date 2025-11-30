const User=require("../../models/userSchema");

const getOrderList=async(req,res)=>{
    try {
        const userData=await User.find();
        const orderDetails=userData.map((user)=>user.orders);
        res.render("orderList",{
            orderDetails:orderDetails,
        });
    } catch (error) {
        console.error("Error while getting orders list",error);
        res.redirect("/pageerror");
    }
}

const changeOrderStatus= async (req,res)=>{
    try {
        const orderId=req.params.id;
        const {status,email}=req.body;
        await User.updateOne({email:email,"orders.orderId":orderId},{$set:{"orders.$.status":status}});
        res.json({success:true})
        const userData= await User.findOne({email:email});
        console.log(userData.orders);
    } catch (error) {
        console.error("Error while changing order status,",error);
        res.json({success:false,message:error.message});
    }
}

module.exports={
    getOrderList,
    changeOrderStatus
}