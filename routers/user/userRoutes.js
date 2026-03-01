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
const orderController=require("../../controllers/user/orderController");
const paymentController=require("../../controllers/user/paymentController");
const generalController=require("../../controllers/user/generalController");


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
    req.session.user=req.user._id;
    req.session.google=true;
 res.redirect("/");
})

//forgot password

router.get("/forgotpassword",userController.loadForgotPassword);
router.post("/forgotpassword",userController.emailVerification);
router.get("/verify-pass-otp",userController.loadVerifyPassOtp)
router.post("/verify-pass-otp",userController.verifyPassOtp)
router.get("/reset-password",userController.loadResetPassword);
router.patch("/reset-password",userController.resetPassword);

//Shop management

router.get("/shop",userAuth,shopController.loadShopPage);
router.get("/product-details",userAuth,shopController.loadProductDetails);
router.post("/add-to-cart/:id",userAuth,shopController.addToCart);
router.post("/add-to-wishlist/:id",userAuth,shopController.addTowishlist);
router.delete("/remove-from-wishlist/:id",userAuth,shopController.removeFromWishlist)

//cart management

router.get("/cart",userAuth,cartController.loadCart);
router.patch("/cart/quantity",userAuth,cartController.changeQuantity);
router.patch("/cart/remove",userAuth,cartController.removeItem);

//profile management
router.get("/profile",userAuth,profileController.loadProfile);
router.post("/add-address",userAuth,profileController.addAddress);
router.post("/edit-address/:id",userAuth,profileController.editAddress);
router.get("/delete-address/:id",userAuth,profileController.deleteAddress);
router.get("/edit-profile",userAuth,profileController.loadEditProfile);
router.patch("/change-profile-pic/:id",userAuth,uploads.single("profileImageInput"),profileController.changeProfilePicture);
router.post("/edit-profile",userAuth,profileController.editProfile);
router.get("/otp-verification",userAuth,profileController.loadVerifyOtp);
router.post("/otp-verification",userAuth,profileController.verifyOtp);
router.post("/referal",userAuth,userController.applyReferalCode);

//page not found
router.get("/error",generalController.pageNotFound);

//checkout management
router.get("/validate-cart",userAuth,checkoutController.validateCart);
router.get("/checkout",userAuth,checkoutController.loadCheckout);
router.patch("/coupon",userAuth,checkoutController.applyCoupon);
router.patch("/clear-coupon",userAuth,checkoutController.removeCoupon);
router.get("/orders",userAuth,orderController.displayOrder);
router.post("/place-order",userAuth,orderController.placeOrder);
router.post("/cancel-order/:id",userAuth,orderController.cancelOrder);
router.post("/return-order/:id",userAuth,orderController.returnOrder);
router.patch("/cancel/:productId",userAuth,orderController.singleCancel);
router.patch("/return/:productId",userAuth,orderController.singleReturn);
router.get("/order-success",userAuth,orderController.orderSuccess);
router.post("/add-new-address",userAuth,checkoutController.addAddress);
router.post("/edit-current-address/:id",userAuth,checkoutController.editAddress);
router.post("/payment/create-order",userAuth,paymentController.createRazorpayOrder);
router.post("/update-order-payment-status/:orderId",userAuth,orderController.updatePayment);
router.get("/payment-failed",userAuth,orderController.paymentFailure);




module.exports=router