const User=require("../../models/userSchema");
const bcrypt=require("bcrypt");
const loadLogin=async(req,res)=>{
    try {
        res.render("adminLogin",{message:null});
    } catch (error) {
        console.log("Error while loading the login page",error);
        res/redirect("/adminerror");
    }
}

const loadDashboard=async(req,res)=>{
    try {
        res.render("dashboard");
    } catch (error) {
        console.error("Error while loading dashboard",error);
        res.redirect("/adminerror");
    }
}

const login=async(req,res)=>{
    try {
        const{email,password}=req.body;
        const findUser= await User.findOne({email:email,isAdmin:1});
        req.session.admin=findUser._id;
        if(findUser){
            const passMatch= await bcrypt.compare(password,findUser.password);
            if(passMatch){
                res.redirect("/admin");
            }else{
                res.render("adminLogin",{message:"Please enter the correct credentials"})
            }
        }else{
             res.render("adminLogin",{message:"User not found"});
        }
    } catch (error) {
        console.error("Error while login in",error);
        res.render("adminLogin",{message:"Something went wrong, please try again."});
    }
}

const logout=async(req,res)=>{
    try {
        req.session.destroy((err)=>{
            if(err){
                console.error(err);
            }
        });
        res.redirect("/admin/login");
    } catch (error) {
        console.error("Error while logging out",error);
        res.redirect("/admin/error")
    }
}


module.exports={
    loadLogin,
    login,
    loadDashboard,
    logout
}