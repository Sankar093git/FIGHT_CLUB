const User=require("../../models/userSchema");
const Product=require("../../models/productSchema");

const loadCart=async (req,res)=>{
    try {
        const user=req.session.user;
        const userData=await User.findOne({_id:user}).populate("cart.product");
        res.render("cart",{
            userData:userData,
            user:userData.name,
            image:req.session.image
        });
    } catch (error) {
        console.error("Error while loading cart-page",error);
        res.redirect("/error");
    }
}

const changeQuantity= async (req,res)=>{
    try {
          const userData = await User.findOne({ _id: req.session.user }).populate("cart.product");
          const action = req.body.action;
          const pId = req.body.id;

          const cartItem = userData.cart.find(item => item.product._id.toString() === pId);

          if (!cartItem) {
          console.log("Product not found in cart");
          return;
          }

          if (action === 'increment') {
            if (cartItem.quantity >= cartItem.product.quantity) {
               return res.status(400).json({success:false,message:"Out of stock"});
            } else if (cartItem.quantity >= 5) {
               return res.status(400).json({success:false,message:"Limit exceeded"});
            } else {
              await User.updateOne(
              { _id: req.session.user, "cart.product": pId },
              { $inc: { "cart.$.quantity": 1 } }
             );
             await Product.updateOne(
              {_id:pId},{$inc:{quantity:-1}}
             )
             return res.status(200).json({success:true});
          }
        }else if(action==="decrement"){
          if(cartItem.quantity<=1){
            return res.status(400).json({success:false,message:"Click trash icon to remove the product"});
          }else{
          await User.updateOne(
              { _id: req.session.user, "cart.product": pId },
              { $inc: { "cart.$.quantity": -1 } }
             );
             await Product.updateOne(
              {_id:pId},{$inc:{quantity:1}}
             )
            }
            return res.status(200).json({success:true});
        } 
        
    } catch (error) {
        console.error("Error while changing quantity",error);
        res.redirect("/error");
    }
}

const removeItem = async (req, res) => {
  try {
    const pId = req.body.product;  
    const cId=req.body.item;
    const userData= await User.findOne({_id:req.session.user});

    const itemDetails=userData.cart.find((cart)=>cart._id==cId);
    const count=itemDetails.quantity;
    await User.updateOne(
      { _id: req.session.user },    
      { $pull: { cart: { product: pId } } } 
    );

    await Product.updateOne({_id:pId},{$inc:{quantity:count}});
   res.status(200).json({success:true});

  } catch (error) {
    console.error("Error while removing item", error);
    res.redirect("/error");
  }
};


module.exports={
    loadCart,
    changeQuantity,
    removeItem
}