const Order=require("../../models/orderSchema");
const Transactions=require("../../models/transactionSchema");
const Product=require("../../models/productSchema");

const loadSalesReport= async(req,res)=>{
    try {
        const {startDate,endDate,period}=req.body;
        let totalSalesCount=0;
        const start=new Date(startDate);
        const end=new Date(endDate);
        const orderDetails=await Order.find({createdAt:{$gte:start,$lte:end}}).populate("user");
        console.log("Sample order : ",orderDetails.length);

        if(orderDetails.length===0){
           return res.status(400).json({success:false,message:"No orders have been made yet!"});
        }

        //calculating total sales count

         totalSalesCount= await Order.countDocuments({
                createdAt:{$gte:start,$lte:end},
                    paymentStatus:"PAID",
                    status:{$nin:["Returned","Cancelled"]}
                
                });

        if(totalSalesCount===0){
            res.status(200).json({success:true,message:{
                totalSalesCount:0,
                totalOrderAmount:0,
                totalRefund:0,
                totalDiscount:0
            },orders:orderDetails});
        }

        console.log("Total sales : ",totalSalesCount);

        //calculating total amount

        const ordersCheck=await Order.find(
            {
                createdAt:{$gte:start,$lte:end},
                    paymentStatus:"PAID",
                    status:{$nin:["Returned","Cancelled"]}
                }
        )

        console.log(ordersCheck.length);

        let [{totalOrderAmount}]= await Order.aggregate([
            {
                $match:{
                    createdAt:{$gte:start,$lte:end},
                    paymentStatus:"PAID",
                    status:{$nin:["Returned","Cancelled"]}
             }
           },
           {
            $group:{
                _id:null,
                totalOrderAmount:{$sum:"$totalAmount"}
            }
           },
           {
            $project:{
                _id:0
            }
           }
         ]);
        console.log("Total revenue : ",totalOrderAmount);

        //Calculating total offer discount
        let [{totalOfferDiscount}]= await Order.aggregate([
            {
                $match:{
                    createdAt:{$gte:start,$lte:end},
                    paymentStatus:"PAID",
                    status:{$nin:["Returned","Cancelled"]}
                }
            },
            {
                $unwind:"$products"
            },
            {
                $group:{
                    _id:null,
                    totalOfferDiscount:{$sum:"$products.discount"}
                }
            },
            {
                $project:{
                    _id:0
                }
            }
        ]);
        console.log("Total offer discount given : ",totalOfferDiscount);
        //Calculating total coupon discount

        let [{totalDiscount}]= await Order.aggregate([
            {
                $match:{
                    createdAt:{$gte:start,$lte:end},
                    paymentStatus:"PAID",
                    status:{$nin:["Returned","Cancelled"]}
                }
            },
            {
                $group:{
                    _id:null,
                    totalDiscount:{$sum:"$discountValue"}
                }
            },
            {
                $project:{
                    _id:0
                }
            }
        ]);

        console.log("Total coupon discount given : ", totalDiscount);

        let [{totalRefund}]= await Transactions.aggregate([
            {
                $match:{
                    method:"refund",
                    createdAt:{$gte:start,$lte:end}
                }
            },
            {
                $group:{
                    _id:null,
                    totalRefund:{$sum:"$amount"}
                }
            },
            {
                $project:{
                    _id:0
                }
            }
        ]);

        console.log("Total refunds given : ",totalRefund);

        res.status(200).json({success:true,message:{
            totalSalesCount,
            totalOrderAmount,
            totalRefund,
            totalDiscount,
        },orders:orderDetails});
        

    } catch (error) {
        console.error("Sales report fetch: ",error);
        res.status(500).json({success:false,message:"Something went wrong"});
    }
}

module.exports={
    loadSalesReport
}