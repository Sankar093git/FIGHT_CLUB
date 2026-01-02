const Coupon=require("../../models/couponSchema");

const loadCouponManagement= async (req,res)=>{
    try {
        res.render("coupon");
    } catch (error) {
        console.error("Coupon page load:",error);
        res.status(500).redirect("/admin/error");
    }
}

module.exports={
    loadCouponManagement
}