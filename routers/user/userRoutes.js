const express=require("express");
const userController=require("../../controllers/user/userController1");
const shopController=require("../../controllers/user/shopController");
const router=express.Router();
const{userAuth,userAuth1}=require("../../middlewares/auth");
const passport=require("../../config/passport");
const cartController=require("../../controllers/user/cartController");
const uploads=require("../../helpers/multer");
const profileController=require("../../controllers/user/profileController");
const checkoutController=require("../../controllers/user/checkoutController");

//signup and login management

router.get("/signup",userAuth1,userController.loadSignUp);
router.post("/signup",uploads.single("profileImage"),userController.signUp);``
router.get("/verify-otp",userController.loadVerifyOtp);
router.get("/",userController.loadHome)
router.get("/login",userAuth1,userController.loadLogin)
router.get("/logout",userController.logout)
router.get("/resend-otp",userController.resendOtp)
router.post("/login",userController.login);
router.post("/verify-otp",userAuth,userController.verifyOtp);

router.get("/auth/google",passport.authenticate('google',{scope:["profile","email"]}));

router.get("/auth/google/callback",passport.authenticate("google",{failureRedirect:"/signup"}),(req,res)=>{
 res.redirect("/")
})
//forgot password

router.get("/forgotpassword",userController.loadForgotPassword);
router.post("/forgotpassword",userController.emailVerification);
router.get("/verify-pass-otp",userController.loadVerifyPassOtp)
router.post("/verify-pass-otp",userController.verifyPassOtp)
router.get("/reset-password",userController.loadResetPassword);
router.post("/reset-password",userController.resetPassword);

//Shop management

router.get("/shop",userAuth,shopController.loadShopPage);
router.get("/product-details",userAuth,shopController.loadProductDetails);
router.post("/add-to-cart/:id",userAuth,shopController.addToCart);

//cart management

router.get("/cart",userAuth,cartController.loadCart);
router.post("/cart/change-quantity",userAuth,cartController.changeQuantity);
router.post("/cart/remove",userAuth,cartController.removeItem);

//profile management
router.get("/profile",userAuth,profileController.loadProfile);
router.post("/add-address",userAuth,profileController.addAddress);
router.post("/edit-address/:id",userAuth,profileController.editAddress);
router.get("/delete-address/:id",userAuth,profileController.deleteAddress);
router.get("/edit-profile",userAuth,profileController.loadEditProfile);
router.post("/change-profile-pic/:id",userAuth,uploads.single("profileImageInput"),profileController.changeProfilePicture);
router.post("/edit-profile",userAuth,profileController.editProfile);
router.get("/otp-verification",userAuth,profileController.loadVerifyOtp);
router.post("/otp-verification",userAuth,profileController.verifyOtp);

//checkout management
router.get("/checkout",userAuth,checkoutController.loadCheckout);
router.post("/place-order",userAuth,checkoutController.placeOrder);
router.post("/cancel-order/:id",userAuth,profileController.cancelOrder);
router.get("/order-success",userAuth,checkoutController.orderSuccess);
router.post("/add-new-address",userAuth,checkoutController.addAddress);
router.post("/edit-current-address/:id",userAuth,checkoutController.editAddress);



module.exports=router