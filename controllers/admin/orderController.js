const User=require("../../models/userSchema");
const Product=require("../../models/productSchema");

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
 const handlingRefund= async(req,res)=>{
    try {
        const{email,currentReturnApproval}=req.body;
        const orderId=req.params.id;
        if(currentReturnApproval){
             await User.updateOne({email:email,"orders.orderId":orderId},{$set:{"orders.$.status":"Returned"}});
             return res.json({success:true,message:"Api works"});
        }else{
             const userData= await User.findOne({email:email});
             const orderDetails=userData.orders.find((order)=>order.orderId==orderId);
             const productIds=orderDetails.products;
             for(let prod of productIds){
                await Product.updateOne({_id:prod.product},{$inc:{quantity:-prod.quantity}})
             }
             await User.updateOne({email:email,"orders.orderId":orderId},{$set:{"orders.$.status":"Return rejected"}})
             return res.json({success:true,message:"Api works"});
        }
    } catch (error) {
        console.log("Error while handling refund");
        res.json({success:false,message:`${error.message}`});
    }
 }


module.exports={
    getOrderList,
    changeOrderStatus,
    handlingRefund,
}