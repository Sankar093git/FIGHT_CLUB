const User=require("../../models/userSchema");
const bcrypt=require("bcrypt");
const session = require("express-session");
const nodemailer=require("nodemailer");
require("dotenv").config()

const loadHome= async (req,res)=>{
    try {
        if(req.session.user){
            const findUser= await User.findById(req.session.user);
            res.render("home",{user:findUser.name,
                image:req.session.image
            });
        }else{
            res.render("home");
        }
        
    } catch (error) {
        console.error("Error while loading homepage",error)
    }
}
const loadSignUp=async(req,res)=>{
    try {

        res.render("signUp",{message:null});
        
    } catch (error) {
        console.log('Error while loading page',error);
        res.redirect("/pageNotFound");
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

const sendVerificationMail=async(OTP,email)=>{
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

        const info= await transporter.sendMail({
            from:process.env.NODEMAILER_EMAIL,
            to:email,
            subject:"Verify your account",
            text:`Your OTP is ${OTP}`,
            html:`<b>Your OTP: ${OTP}</b>`
        })

        return info.accepted.length>0;

    } catch (error) {
        console.error("Error while sendin verification mail",error);
        return false

}

}
const signUp=async (req,res)=>{
    try {
        const {name,email,phone,password}=req.body;

        const checkUser= await User.findOne({email:email});

        if(!checkUser){

        const passHash= await securePassword(password);

        let profileImage = "default-avatar.jpg"; 

        if (req.file) {
             console.log(req.file);
             profileImage = req.file.filename; 
        }

        const newUser= await User({
            name:name,
            email:email,
            phone:phone,
            password:passHash,
            userImage:profileImage
        })

        await newUser.save();
        req.session.user=newUser._id;
        req.session.email=newUser.email
        req.session.image=newUser.userImage
        const OTP= await generateOTP();
        req.session.otp=OTP;
        console.log(` The otp is ${OTP}`);
        const mailSent= await sendVerificationMail(OTP,email);
        if(mailSent){
            res.redirect("/verify-otp");
        }else{
            console.log("Email verification failed")
        }
    }else{
       res.render("signup",{message:"User already exists!"});
    }
        
    } catch (error) {
        console.error("Error while creating account", error);
        res.redirect("/pageNotFound");
    }
}

const loadLogin=async(req,res)=>{
    try {
       res.render("login");
    } catch (error) {
        console.error("Error while loading login page",error);
        res.redirect("/error");
    }
}
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const findUser = await User.findOne({ email: email });

    if (!findUser) {
      return res.json({ message: "User not found" });
    }

    const isPasswordMatch = await bcrypt.compare(password, findUser.password);

    if (isPasswordMatch) {
      req.session.user = findUser._id;
      req.session.userName=findUser.name;
      req.session.image=findUser.userImage
      req.session.email=email;
      res.redirect("/");
    } else {
      res.json({ message: "Please enter valid credentials" });
    }
  } catch (error) {
    console.error("Error while logging in", error);
    res.redirect("/error");
  }
}

const loadVerifyOtp=async(req,res)=>{
    try {
        res.render("verify-otp");
    } catch (error) {
        console.error("Error while loading verify otp page",error);
        res.redirect("/error");
    }
}

const loadVerifyPassOtp=async(req,res)=>{
    try {
        res.render("verifypassOtp");
    } catch (error) {
        console.error("Error while loading verify otp page",error);
        res.redirect("/error");
    }
}

const resendOtp = async (req, res) => {
  try {
    const OTP = await generateOTP();  
    req.session.otp = OTP;      
    console.log("The resend OTP:",OTP);
    const sentMail = await sendVerificationMail(OTP, req.session.email); 

    if (sentMail) {
      res.status(200).json({ success: true });
    } else {
      res.status(500).json({ success: false, message: "Failed to send email" });
    }
  } catch (error) {
    console.log("Error while resending OTP:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const verifyOtp=async(req,res)=>{
    try {
        const OTP=req.session.otp;
        const {otp}=req.body;
        if(OTP===otp){
            await User.updateOne({email:req.session.email},{$set:{isVerified:1}});
            res.status(200).json({success:true,message:"OTP verified succcesfully"})
        }else{
            res.status(200).json({success:false,message:"Invalid OTP"});
        }
    } catch (error) {
        console.log("Error while otp verification",error);
    }
}
const loadForgotPassword=async(req,res)=>{
    try {
        res.render("forgot-password");
    } catch (error) {
        console.error("Error while loading forgot password",error);
        res.redirect("/error");
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
         const sentMail= await sendVerificationMail(OTP,email);
         if(sentMail){
            res.status(200).json({success:true,message:"OTP has been send to your mail!"});
         }else{
            res.status(503).json({success:false,message:"Unable to send email!"});
         }
        }else{
            res.status().json({success:false,message:"Email does not exist!"})
        }
    } catch (error) {
        console.error("Error while verifying email Id",error);
        res.redirect("/error");
    }
}

const loadResetPassword=async(req,res)=>{
    try {
        res.render("reset-password");
    } catch (error) {
        console.error("Error while loading the page",error);
        res.redirect("/error")
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
        return res.status(200).json({success:true,redirectUrl:"/login"});
      });
    } else {
      return res.status(400).json({success:false});
    }

  } catch (error) {
    console.error("Error while resetting password:", error);
    return res.json({success:false});
  }
};


const verifyPassOtp=async(req,res)=>{
    try {
        const {otp}=req.body;
        if(otp===req.session.otp){
            res.status(200).json({success:true,message:"OTP successfully verified!"});
        }else{
            res.status(400).json({success:true,message:"Incorrect OTP"});
        }
    } catch (error) {
        console.error("Error while verifying otp",error);
        res.redirect("/error");
    }
}


const logout=async(req,res)=>{
    try {
        req.session.destroy();
        res.redirect("/")
    } catch (error) {
        console.error("Error while logging out",error)
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
    securePassword
}