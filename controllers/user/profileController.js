const User=require("../../models/userSchema");
const{sendVerificationMail,generateOTP,securePassword}=require("../../controllers/user/userController1");
const Product=require("../../models/productSchema");

const loadProfile=async (req,res)=>{
    try {
        const id=req.session.user;
        const findUser=await User.findOne({_id:id,isBlocked:false});
        const image=findUser.userImage;
        res.render('profile',{
            userData:findUser,
            user:req.session.userName,
            image:image
        })



    } catch (error) {
        console.log("Error while loading profilepage",error);
        res.redirect("/error");
    }
}

const addAddress= async (req,res)=>{
    try {
        await User.updateOne({_id:req.session.user},{$addToSet:{address:req.body}});
        res.redirect("/profile");

    } catch (error) {
        console.error("Error while adding address",error);
        res.redirect("/error");
    }
}

const editAddress= async (req,res)=>{
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

        res.redirect("/profile");
        
    } catch (error) {
        console.error("Addess edit error,",error);
        res.redirect("/error");
    }
}
const deleteAddress= async (req,res)=>{
    try {
        const id=req.params.id;
        await User.updateOne({_id:req.session.user},{$pull:{address:{_id:id}}})
        res.redirect("/profile")
    } catch (error) {
        console.error("Error while deleting address",error);
        res.redirect("/error");
    }
}

const loadEditProfile= async (req,res)=>{
    try {

        const userData= await User.findOne({_id:req.session.user});
        res.render("edit-profile",{
           userData:userData
        })
    } catch (error) {
        console.error("Error while loading edit profile page",error);
    }
}

const changeProfilePicture=async(req,res)=>{
    try {
        const id=req.params.id;
        const image=req.file.filename;
        await User.updateOne({_id:id},{$set:{userImage:image}});
        res.json({redirectURL:"/profile",
            image:image
        });
    } catch (error) {
        console.error("Error while changing the profile picture", error);
        res.json({message:"Somthing went wrong"});
    }
}

const editProfile = async (req,res)=>{
    try {
        const {email,phone,password} = req.body;
        req.session.email=email;
        req.session.phone=phone;
        req.session.password=password;
        const otp = await generateOTP();
        console.log("The otp is: ",otp);
        const sendMail= await sendVerificationMail(otp,req.session.email);
        req.session.otp=otp;
        if( sendMail){
            res.json({result:true});
        }else{
            res.json({result:false});
        }

    } catch (error) {
        console.log("Error while editing the user profile",error);
        res.redirect("/error");
    }
}

const loadVerifyOtp=async(req,res)=>{
    try {
        res.render("verify-otp-editProfile");
    } catch (error) {
        console.error("Error while loading otp page",error);
    }
}

const verifyOtp=async(req,res)=>{
    try {
        const {otp} =req.body;
        console.log(req.session.otp);
        if (!req.session.otp) {
          return res.status(400).json({ success: false, message: "Session expired. Please try again." });
              }
        if(otp==req.session.otp){
            const newEmail=req.session.email;
            delete req.session.email;
            const newPhone=req.session.phone;
            delete req.session.phone;
            const newPass=req.session.password;
            delete req.session.password;
            const userData= await User.findOne({_id:req.session.user});

            if(userData.email==newEmail&&newPass){
                const newPassword = await securePassword(newPass);
                await User.updateOne({_id:req.session.user},{$set:{phone:newPhone,password:newPassword}});
                return res.json({success:true, message:"OTP verified successfully"});
            }else{
                 await User.updateOne({_id:req.session.user},{$set:{email:newEmail,phone:newPhone}});
                return res.json({success:true, message:"Email Id changed succesfully"});
            }
        }else{
            res.json({success:false, message:"Invalid OTP!"});
        }
    } catch (error) {
        console.error("Error occured while verifying otp",error);
        res.redirect("/error");
    }
}

const cancelOrder= async(req,res)=>{
    try {
        const userData= await User.findOne({_id:req.session.user});
        const orderId= req.params.id;
        await User.updateOne({_id:req.session.user,"orders.orderId":orderId},{$set:{"orders.$.status":"Cancelled"}});
        const orderDetails=userData.orders.find((order)=>order.orderId==orderId);
        const productDetails=orderDetails.products;
        for(let prod of productDetails){
             await Product.updateOne({_id:prod.product},{$inc:{quantity:prod.quantity}});
        }
         res.json({success:true});       
    } catch (error) {
        console.error("Error while cancelling order,",error);
         res.json({success:false,});
    }
}

const returnOrder= async(req,res)=>{
    try {
        const userData= await User.findOne({_id:req.session.user});
        const orderId= req.params.id;
        const returnMessage=req.body.message;
        await User.updateOne({_id:req.session.user,"orders.orderId":orderId},{$set:{"orders.$.status":"Processing return","orders.$.reasonForReturn":returnMessage}});
        const orderDetails=userData.orders.find((order)=>order.orderId==orderId);
        const productDetails=orderDetails.products;
        for(let prod of productDetails){
             await Product.updateOne({_id:prod.product},{$inc:{quantity:prod.quantity}});
        }
         res.json({  
            success: true,
            message: "Return request submitted",
            reason: returnMessage
        });       
    } catch (error) {
        console.error("Error while cancelling order,",error);
        res.json({success:false,});
    }
}

const displayOrder= async (req,res)=>{
    try {
        const orderId=req.query.id;
        const userData= await User.findOne({_id:req.session.user}).populate("orders.products.product");
        const orderDetails=userData.orders.find((order)=>order.orderId==orderId);
        const subArr=[];
        orderDetails.products.forEach((prod)=>{
            subArr.push(prod.product.salesPrice);
        })
        const subTotal=subArr.reduce((acc,num)=>acc+num,0);
        const total=subTotal+100+50-200;
        res.render("orderDetails",{
            Product:orderDetails.products,
            addr:orderDetails.address,
            subtotal:subTotal,
            discount:200,
            shipping:100,
            taxes:50,
            total:total,
            status:orderDetails.status,
        });

        console.log(orderDetails.products);

    } catch (error) {
        console.error("Error while diplaying order,",error);    
        res.redirect("/error");
    }
}
module.exports={
    loadProfile,
    addAddress,
    deleteAddress,
    loadEditProfile,
    changeProfilePicture,
    editProfile,
    loadVerifyOtp,
    verifyOtp,
    editAddress,
    cancelOrder,
    displayOrder,
    returnOrder

}
