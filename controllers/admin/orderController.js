const User=require("../../models/userSchema");
const Product=require("../../models/productSchema");

const getOrderList = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 4;
    const skip = (page - 1) * limit;
    const { search, status, sort, date } = req.query;

    // Get all users with orders
    const users = await User.find({ "orders.0": { $exists: true } });
    
    // Flatten all orders with user info
    let orderDetails = users.flatMap(u => 
      u.orders.map(order => ({ ...order.toObject(), userId: u._id }))
    );

    // Filter by search
    if (search) {
      if (/^ORD-[A-Fa-f0-9]{8}$/.test(search)) {
        orderDetails = orderDetails.filter(o => o.orderId === search);
      } else if (/^[A-Za-z][A-Za-z ]{1,50}$/.test(search)) {
        orderDetails = orderDetails.filter(o => 
          o.name.toLowerCase().includes(search.toLowerCase())
        );
      } else if (/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(search)) {
        orderDetails = orderDetails.filter(o => o.email === search);
      }
    }

    // Filter by status 
    if (status && status !== "") {
      orderDetails = orderDetails.filter(o => o.status === status);
    }

    // Filter by date
    if (date) {
      const selectedDate = new Date(date);
      const nextDate = new Date(selectedDate);
      nextDate.setDate(selectedDate.getDate() + 1);
      orderDetails = orderDetails.filter(o => 
        new Date(o.createdAt) >= selectedDate && new Date(o.createdAt) < nextDate
      );
    }

    // Sort
    if (sort === "date-desc") {
      orderDetails.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sort === "date-asc") {
      orderDetails.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } else if (sort === "amount-desc") {
      orderDetails.sort((a, b) => b.totalAmount - a.totalAmount);
    } else if (sort === "amount-asc") {
      orderDetails.sort((a, b) => a.totalAmount - b.totalAmount);
    }

    const totalOrders = orderDetails.length;
    const totalPages = Math.ceil(totalOrders / limit);
    const paginatedOrders = orderDetails.slice(skip, skip + limit);
    return res.render("orderList", {
      queryValues:req.query,
      orderDetails: paginatedOrders,
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

 const displayOrder= async (req,res)=>{
    try {
        const orderId=req.query.orderId;
        const email=req.query.email;
        const userData= await User.findOne({email:email}).populate("orders.products.product");
        const orderDetails=userData.orders.find((order)=>order.orderId==orderId);
        console.log(orderDetails);
        const subArr=[];
        orderDetails.products.forEach((prod)=>{
            subArr.push(prod.product.salesPrice);
        })
        const subTotal=subArr.reduce((acc,num)=>acc+num,0);
        const total=subTotal+100+50-200;
        res.render("orderDetailsAdmin",{
            Product:orderDetails.products,
            addr:orderDetails.address,
            subtotal:subTotal,
            discount:200,
            shipping:100,
            taxes:50,
            total:total,
            status:orderDetails.status,
        });

    } catch (error) {
        console.error("Error while diplaying order,",error);    
        res.redirect("/error");
    }
}


module.exports={
    getOrderList,
    changeOrderStatus,
    handlingRefund,
    displayOrder
}