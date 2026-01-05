const Coupon=require("../../models/couponSchema");

const loadCouponManagement= async (req,res)=>{
    try {
         const filter = {};

         const { search, status } = req.query;

    
        if (search && search.trim() !== "") {
          filter.code = { $regex: search, $options: "i" };
        }

    
        if (status && status !== "all") {
          filter.status = status;
        }

        const page=req.query.page||1;
        const limit=5;
        const skip=(page-1)*limit;
        const couponDetails= await Coupon.find(filter).sort({createdAt:-1}).skip(skip).limit(limit);
        const totalCoupons= await Coupon.countDocuments(filter);
        const activeCoupons= await Coupon.countDocuments({status:"Active"});
        const totalPages=Math.ceil(totalCoupons/limit);
        const coupons= await Coupon.find();
        const totalRedemptions= coupons.map((r)=>r.redemptions).reduce((acc,num)=>acc+num,0);
        res.status(200).render("coupon",{
            coupon:couponDetails,
            totalPages:totalPages,
            currentPage:page,
            totalCoupons:totalCoupons,
            activeCoupons:activeCoupons,
            totalRedemptions:totalRedemptions,
            limit:limit,
            filter,
            search
        });
    } catch (error) {
        console.error("Coupon page load:",error);
        res.status(500).redirect("/admin/error");
    }
}

const addcoupon= async(req,res)=>{
    try {
        const {code,
            discountType,
            discountValue,
            minPurchase,
            usageLimit,
            maxDiscount,
            startDate,
            endDate,
            description
        }=req.body;

        const newCoupon= new Coupon({
            code:code,
            discountType:discountType,
            discountValue:discountValue,
            minPurchase:minPurchase,
            maxDiscount:maxDiscount,
            usageLimit:usageLimit,
            startDate:startDate,
            expiryDate:endDate,
            description:description
        })

        await newCoupon.save();
        res.status(201).json({success:true,message:"Coupon added successfully"});
    } catch (error) {
        console.error("Add Coupon:",error);
        res.status(500).json({success:false,message:"Something went wrong!"});
    }
}

const editCoupon = async (req, res) => {
  try {
    const { couponId } = req.params;

    if (!couponId) {
      return res.status(400).json({
        success: false,
        message: "Coupon ID is required"
      });
    }

    const coupon = await Coupon.findById(couponId);
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found"
      });
    }

    const {
      code,
      discountType,
      discountValue,
      minPurchase,
      usageLimit,
      maxDiscount,
      startDate,
      endDate,
      description
    } = req.body;

    // Prevent duplicate coupon codes
    if (code && code !== coupon.code) {
      const existing = await Coupon.findOne({
        code: code.toUpperCase(),
        _id: { $ne: couponId }
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          message: "Coupon code already exists"
        });
      }
    }

    // Update fields
    coupon.code = code?.toUpperCase() ?? coupon.code;
    coupon.discountType = discountType ?? coupon.discountType;
    coupon.discountValue = discountValue ?? coupon.discountValue;
    coupon.minPurchase = minPurchase ?? coupon.minPurchase;
    coupon.usageLimit = usageLimit ?? coupon.usageLimit;
    coupon.maxDiscount = maxDiscount ?? coupon.maxDiscount;
    coupon.startDate = startDate ?? coupon.startDate;
    coupon.expiryDate = endDate ?? coupon.expiryDate;
    coupon.description=description??coupon.description;

    // Auto status calculation
    const now = new Date();
    if (coupon.expiryDate < now) {
      coupon.status = "Expired";
    } else if(coupon.startDate>now) {
      coupon.status = "Scheduled";
    }else{
      coupon.status = "Active";
    }

    await coupon.save();

    return res.status(200).json({
      success: true,
      message: "Coupon updated successfully",
      coupon
    });

  } catch (error) {
    console.error("Edit coupon:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong!"
    });
  }
}

const deleteCoupon=async(req,res)=>{
    try {
        const couponId=req.params.couponId;
        const exists= await Coupon.findOne({_id:couponId});
        if(!exists){
            return res.status(400).json({success:false,message:"Coupon does not exist"});
        }else{
            await Coupon.deleteOne({_id:couponId});
            return res.status(200).json({success:true,message:"Coupon deleted successfully!"});
        }
    } catch (error) {
        console.error("Delete coupon:",error);
        res.status(500).json({
            success:false,
            message:"Something went wrong!"
        })
    }
}

module.exports={
    loadCouponManagement,
    addcoupon,
    editCoupon,
    deleteCoupon
}