const User=require("../../models/userSchema");
const Order=require("../../models/orderSchema");
const Product=require("../../models/productSchema");
const bcrypt=require("bcrypt");
const crypto=require("crypto");
const nodemailer=require("nodemailer");
require("dotenv").config()
const STATUS_CODES=require("../../utils/statusCode");

const loadHome= async (req,res)=>{
    try {
        const mostWanted= await Order.aggregate([
            {
                $match:{
                    paymentStatus:"PAID",
                    status:{$nin:["Returned","Cancelled"]}
                }
            },
            {
                $unwind:"$products"
            },
            {
                $group:{
                    _id:"$products.product",
                    count:{$sum:"$products.quantity"}
                }   
            },
            {
                $lookup:{
                    from:"products",
                    localField:"_id",
                    foreignField:"_id",
                    as:"productDetails"
                }
            },
            {
                $unwind:"$productDetails"
            },
            {
                $sort:{count:-1}
            },
            {
                $limit:10
            },
            {
                $project:{
                    _id:1,
                    name:"$productDetails.productName",
                    image:{ $arrayElemAt: ["$productDetails.productImage", 0] },
                    salePrice:"$productDetails.salesPrice",
                    regularPrice:"$productDetails.regularPrice"
                }
            }
        ]);

        const latestProducts= await Product.find({isBlocked:false},{_id:1,productName:1,productImage:1,salesPrice:1,regularPrice:1}).sort({createdAt:-1}).limit(7);

         res.status(STATUS_CODES.OK).render("home",{
            mostWanted,
            latestProducts
    });
    } catch (error) {
        console.error("Error while loading homepage",error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).redirect("/error");
    }
}

const loadSignUp=async(req,res)=>{
    try {
        res.status(STATUS_CODES.OK).render("signUp",{message:null});
        
    } catch (error) {
        console.log('Error while loading page',error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).redirect("/pageNotFound");
    }
}

const securePassword=async (password)=>{
    try {
        const passwordHash=await bcrypt.hash(password,10);
        return passwordHash;
    } catch (error) {
        console.log("Error while hashing password",error)
    }
}

const generateOTP=async()=>{
    try {
         const otp=Math.floor(1000+Math.random()*900000).toString();
         return otp;
    } catch (error) {
        console.error("Error while generating OTP",error);
    }
}

const sendVerificationMail=async(OTP,referalCode,email)=>{
    try {
        const transporter=nodemailer.createTransport({
            service:"gmail",
            port:587,
            secure:false,
            requireTLS:true,
            auth:{
                user:process.env.NODEMAILER_EMAIL,
                pass:process.env.NODEMAILER_PASS
            }
        })

        if(OTP===null){
            const info= await transporter.sendMail({
            from:process.env.NODEMAILER_EMAIL,
            to:email,
            subject:"Referral promo code",
            text:`Your Referal code is ${referalCode}`,
            html:`<b>Your Referal code:${referalCode}</b>`
        })

        return info.accepted.length>0;
        }else if(referalCode===null){
            const info= await transporter.sendMail({
            from:process.env.NODEMAILER_EMAIL,
            to:email,
            subject:"Verify your account",
            text:`Your OTP is ${OTP}`,
            html:`<b>Your OTP: ${OTP}</b>`
        })

        return info.accepted.length>0;

        }

    } catch (error) {
        console.error("Error while sendin verification mail",error);
        return false
    }
}

const signUp=async (req,res)=>{
    try {
        const {name,email,phone,referedCode,password}=req.body;

        console.log(referedCode);

        const checkUser= await User.findOne({email:email});

        if(!checkUser){

        const passHash= await securePassword(password);

        let profileImage = "default-avatar.jpg";

        if (req.file) {
             console.log(req.file);
             profileImage = req.file.filename; 
        }
        const referalCode = "REF-" + crypto.randomBytes(4).toString("hex");
        const newUser= await User({
            name:name,
            email:email,
            phone:phone,
            password:passHash,
            userImage:profileImage,
            referalCode:referalCode
        })

        await newUser.save();

        req.session.user=newUser._id;
        req.session.email=newUser.email
        req.session.image=newUser.userImage
        req.session.referalCode=referalCode
        const OTP= await generateOTP();
        if(referedCode){
            await checkForReferal(referedCode,req.session.email);
        }
        req.session.otp=OTP;
        console.log(` Your otp is ${OTP}`);
        console.log(`Your referal code is ${referalCode}`);
        const mailSent= await sendVerificationMail(OTP,null,email);
        if(mailSent){
            res.status(STATUS_CODES.OK).redirect("/verify-otp");
        }else{
            console.log("Email verification failed")
        }
    }else{
       res.status(STATUS_CODES.BAD_REQUEST).render("signup",{message:"User already exists!"});
    }
        
    } catch (error) {
        console.error("Error while creating account", error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).redirect("/pageNotFound");
    }
}

const loadLogin=async(req,res)=>{
    try {
       res.status(STATUS_CODES.OK).render("login",{
        message:""
       });
    } catch (error) {
        console.error("Error while loading login page",error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).redirect("/error");
    }
}

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const findUser = await User.findOne({ email: email });

    if (!findUser) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({ message: "User not found" });
    }

    const isPasswordMatch = await bcrypt.compare(password, findUser.password);

    if (isPasswordMatch) {
      req.session.user = findUser._id;
      req.session.userName=findUser.name;
      req.session.image=findUser.userImage
      req.session.email=email;
      res.status(STATUS_CODES.OK).redirect("/");
    } else {
      res.status(STATUS_CODES.BAD_REQUEST).render("login",{
        message:"Enter valid credentials"
      })
    }
  } catch (error) {
    console.error("Error while logging in", error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).redirect("/error");
  }
}

const loadVerifyOtp=async(req,res)=>{
    try {
        res.status(STATUS_CODES.OK).render("verify-otp");
    } catch (error) {
        console.error("Error while loading verify otp page",error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).redirect("/error");
    }
}

const loadVerifyPassOtp=async(req,res)=>{
    try {
        res.status(STATUS_CODES.OK).render("verifypassOtp");
    } catch (error) {
        console.error("Error while loading verify otp page",error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).redirect("/error");
    }
}

const resendOtp = async (req, res) => {
  try {
    const OTP = await generateOTP();  
    req.session.otp = OTP;      
    console.log("The resend OTP:",OTP);
    const sentMail = await sendVerificationMail(OTP, req.session.email); 

    if (sentMail) {
      res.status(STATUS_CODES.OK).json({ success: true });
    } else {
      res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: "Failed to send email" });
    }
  } catch (error) {
    console.log("Error while resending OTP:", error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: "Server error" });
  }
};

const verifyOtp=async(req,res)=>{
    try {
        const OTP=req.session.otp;
        const {otp}=req.body;
        if(OTP===otp){
            await User.updateOne({email:req.session.email},{$set:{isVerified:1}});
            const referalCode=req.session.referalCode;
            const sentMail= await sendVerificationMail(null,referalCode,req.session.email);
         if(sentMail){
             res.status(STATUS_CODES.OK).json({success:true,message:"OTP verified succcesfully, your referal code has been sent!"});
         }else{
            res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({success:false,message:"Unable to send referal code!"});  // ✅ 503 → 500
         }
        }else{
            res.status(STATUS_CODES.BAD_REQUEST).json({success:false,message:"Invalid OTP"});
        }
    } catch (error) {
        console.log("Error while otp verification",error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({success:false,message:"Something went wrong!"});
    }
}

const loadForgotPassword=async(req,res)=>{
    try {
        res.status(STATUS_CODES.OK).render("forgot-password");
    } catch (error) {
        console.error("Error while loading forgot password",error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).redirect("/error");
    }
}

const emailVerification=async(req,res)=>{
    try {
        const {email}=req.body;
        const isExists= await User.findOne({email:email});
        if(isExists){
         req.session.email=email;
         const OTP= await generateOTP();
         req.session.otp=OTP;
         console.log(OTP);
         const sentMail= await sendVerificationMail(OTP,null,email);
         if(sentMail){
            res.status(STATUS_CODES.OK).json({success:true,message:"OTP has been send to your mail!"});
         }else{
            res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({success:false,message:"Unable to send email!"});  // ✅ 503 → 500
         }
        }else{
            res.status(STATUS_CODES.BAD_REQUEST).json({success:false,message:"Email does not exist!"})
        }
    } catch (error) {
        console.error("Error while verifying email Id",error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).redirect("/error");
    }
}

const loadResetPassword=async(req,res)=>{
    try {
        res.status(STATUS_CODES.OK).render("reset-password");
    } catch (error) {
        console.error("Error while loading the page",error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).redirect("/error")  // ✅ 400 → 500
    }
}

const resetPassword = async (req, res) => {
  try {
    const email = req.session.email;
    console.log(email);
    const { password1, password2 } = req.body;

    if (password1 === password2) {
      const passHash = await securePassword(password2);
      await User.updateOne({ email }, { $set: { password: passHash } });

      req.session.destroy((err) => {
        if (err) {
          console.error("Session destruction error:", err);
          return res.redirect("/error");
        }
        return res.status(STATUS_CODES.OK).json({success:true,redirectUrl:"/login"});
      });
    } else {
      return res.status(STATUS_CODES.BAD_REQUEST).json({success:false});
    }

  } catch (error) {
    console.error("Error while resetting password:", error);
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({success:false});
  }
};

const verifyPassOtp=async(req,res)=>{
    try {
        const {otp}=req.body;
        if(otp===req.session.otp){
            res.status(STATUS_CODES.OK).json({success:true,message:"OTP successfully verified!"});
        }else{
            res.status(STATUS_CODES.BAD_REQUEST).json({success:false,message:"Incorrect OTP"});  // ✅ success:true → success:false
        }
    } catch (error) {
        console.error("Error while verifying otp",error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).redirect("/error");
    }
}

const logout=async(req,res)=>{
    try {
        req.session.destroy();
        res.status(STATUS_CODES.OK).redirect("/");
    } catch (error) {
        console.error("Error while logging out",error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).redirect("/error");
    }
}

async function checkForReferal(code,email){
   const referalCodes = await User.find(
  { isBlocked: false },
  { referalCode: 1, email: 1, _id: 0 }
);

for(let item of referalCodes){
    if(item.referalCode==code){
        await User.updateOne({email:email},{$set:{referedBy:item.email}});
    }
}
}

const applyReferalCode= async (req,res)=>{
    try {
        const {code}=req.body;
        const referee= await User.findOne({referalCode:code},{_id:1,email:1});
        const user= await User.findOne({_id:req.session.user});

        if(!referee){
            res.status(STATUS_CODES.BAD_REQUEST).json({success:false,message:"Invalid referal code!"});
        }

        if(user.referedBy){
            res.status(STATUS_CODES.BAD_REQUEST).json({success:false,message:"Your have been refered already!"});
        }

        user.referedBy=referee.email;
        await user.save();

        res.status(STATUS_CODES.OK).json({success:true});
    } catch (error) {
        console.error("Referal code : ", error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({success:false,message:"Something went wrong!"});
    }
}

module.exports={
    loadSignUp,
    signUp,
    loadHome,
    loadLogin,
    loadVerifyOtp,
    login,
    logout,
    resendOtp,
    verifyOtp,
    loadForgotPassword,
    emailVerification,
    verifyPassOtp,
    loadResetPassword,
    resetPassword,
    loadVerifyPassOtp,
    sendVerificationMail,
    generateOTP,
    securePassword,
    applyReferalCode
}