const User=require("../models/userSchema");

const userAuth = async (req, res, next) => {
  try {
    if (req.session && req.session.user) {
      next();
    } else {
      res.redirect("/"); 
    }
  } catch (error) {
    console.error("Authentication error:", error);
    res.redirect("/error"); 
  }
};

const userAuth1 = async (req, res, next) => {
  try {
    if (req.session.user) {
      return res.redirect("/");
    }
    next();
  } catch (error) {
    console.error("Redirect middleware error:", error);
    res.redirect("/error");
  }
};

const adminAuth= async (req,res,next)=>{
  try {
    if(req.session.admin){
      next();
    }else{
      res.redirect("/admin/login");
    }
  } catch (error) {
    console.error("Redirect middleware error:", error);
    res.redirect("/adminerror")
  }
}

const adminAuth1= async (req,res,next)=>{
  try {
    if(req.session.admin){
      res.redirect("/admin")
    }else{
      next();
    }
  } catch (error) {
    console.error("Redirect middleware error:", error);
    res.redirect("/adminerror")
  }
}


module.exports={
    userAuth,
    userAuth1,
    adminAuth,
    adminAuth1
}
