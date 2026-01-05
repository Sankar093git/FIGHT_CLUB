const User=require("../../models/userSchema");
const{sendVerificationMail,generateOTP,securePassword}=require("../../controllers/user/userController1");
const Product=require("../../models/productSchema");
const Orders=require("../../models/orderSchema");

const loadProfile=async (req,res)=>{
    try {
        const orderPage=parseInt(req.query.orderPage)||1;
        const orderLimit=5;
        const skip=(orderPage-1)*orderLimit
        const id=req.session.user;
        const findUser=await User.findOne({_id:id,isBlocked:false}).populate("wishlist.product");
        const orderDetails=(await Orders.find({user:id}).sort({ createdAt: -1 }).skip(skip).limit(orderLimit));
        const totalOrders=await Orders.countDocuments({ user: id });
        const totalOrderPages=Math.ceil(totalOrders/orderLimit);
        const image=findUser.userImage;
        const username=findUser.name;
        res.status(200).render('profile',{
            userData:findUser,
            user:req.session.userName||username,
            image:image,
            orders:orderDetails,
            totalOrderPages:totalOrderPages,
            currentOrderPage:orderPage
        })
    } catch (error) {
        console.log("Error while loading profilepage",error);
        res.status(500).redirect("/error");
    }
}

const addAddress= async (req,res)=>{
    try {
        await User.updateOne({_id:req.session.user},{$addToSet:{address:req.body}});
        res.status(200).redirect("/profile");

    } catch (error) {
        console.error("Error while adding address",error);
        res.status(500).redirect("/error");
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

        res.status(200).redirect("/profile");
        
    } catch (error) {
        console.error("Addess edit error,",error);
        res.status(500).redirect("/error");
    }
}
const deleteAddress= async (req,res)=>{
    try {
        const id=req.params.id;
        await User.updateOne({_id:req.session.user},{$pull:{address:{_id:id}}})
        res.status(200).redirect("/profile")
    } catch (error) {
        console.error("Error while deleting address",error);
        res.status(500).redirect("/error");
    }
}

const loadEditProfile= async (req,res)=>{
    try {

        const userData= await User.findOne({_id:req.session.user});
        res.status(200).render("edit-profile",{
           userData:userData
        })
    } catch (error) {
        console.error("Error while loading edit profile page",error);
        res.status(500).redirect("/error");
    }
}

const changeProfilePicture=async(req,res)=>{
    try {
        const id=req.params.id;
        const image=req.file.filename;
        await User.updateOne({_id:id},{$set:{userImage:image}});
        res.status(200).json({success:true,
            image:"/uploads/profiles/"+image
        });
    } catch (error) {
        console.error("Error while changing the profile picture", error);
        res.status(500).json({message:"Somthing went wrong"});
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
            res.status(200).json({result:true});
        }else{
            res.status(500).json({result:false});
        }

    } catch (error) {
        console.log("Error while editing the user profile",error);
        res.status(500).redirect("/error");
    }
}

const loadVerifyOtp=async(req,res)=>{
    try {
        res.status(200).render("verify-otp-editProfile");
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
                return res.status(200).json({success:true, message:"OTP verified successfully"});
            }else{
                 await User.updateOne({_id:req.session.user},{$set:{email:newEmail,phone:newPhone}});
                return res.status(200).json({success:true, message:"Email Id changed succesfully"});
            }
        }else{
            res.status(403).json({success:false, message:"Invalid OTP!"});
        }
    } catch (error) {
        console.error("Error occured while verifying otp",error);
        res.status(500).redirect("/error");
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
    editAddress
}
