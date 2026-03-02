const User=require("../models/userSchema");

const userAuth = async (req, res, next) => {
  try {
    if (req.session && req.session.user) {
       const userData= await User.findOne({_id:req.session.user});
       if(userData.isBlocked===false){
        next();
       }else{
        res.status(400).redirect("/");
       }
    } else {
      res.status(400).redirect("/"); 
    }
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(500).redirect("/error"); 
  }
};

const userAuth1 = async (req, res, next) => {
  try {
    if (req.session.user) {
      return res.status(400).redirect("/");
    }
    next();
  } catch (error) {
    console.error("Redirect middleware error:", error);
    res.status(500).redirect("/error");
  }
};

const adminAuth= async (req,res,next)=>{
  try {
    if(req.session.admin){
      next();
    }else{
      res.status(400).redirect("/admin/login");
    }
  } catch (error) {
    console.error("Redirect middleware error:", error);
    res.sttus(500).redirect("/adminerror")
  }
}

const adminAuth1= async (req,res,next)=>{
  try {
    if(req.session.admin){
      res.status(400).redirect("/admin")
    }else{
      next();
    }
  } catch (error) {
    console.error("Redirect middleware error:", error);
    res.status(500).redirect("/adminerror")
  }
}


module.exports={
    userAuth,
    userAuth1,
    adminAuth,
    adminAuth1
}
