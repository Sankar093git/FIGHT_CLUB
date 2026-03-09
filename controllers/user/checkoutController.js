import User from "../../models/userSchema.js";
import Coupon from "../../models/couponSchema.js";
import Wallet from "../../models/walletShema.js";
import Constants from "../../models/constantSchema.js";
import STATUS_CODES from "../../utils/statusCode.js";

export const validateCart = async (req, res) => {
    try {
        const userData = await User.findOne({ _id: req.session.user }).populate("cart.product").exec();

        for (const item of userData.cart) {
            const variant = item.product.variants.find(v => v.size === item.size);

            if (!variant || variant.stock < item.quantity) {
                return res.status(STATUS_CODES.BAD_REQUEST).json({
                    success: false,
                    message: `${item.product.productName} (${item.size}) is out of stock`
                });
            }
        }

        res.status(STATUS_CODES.OK).json({ success: true });
    } catch (error) {
        console.error("Validate cart error: ", error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: "Something went wrong" });
    }
};

export const loadCheckout = async (req, res) => {
    try {
        let stockError = null;
        let userName = null;

        if (req.session.google === true) {
            const userDetails = await User.findOne({ _id: req.session.user });
            userName = userDetails.name;
        }

        let summary = {};
        let priceList = [];
        const userData = await User.findOne({ _id: req.session.user }).populate("cart.product").exec();

        // Internal helper to expire old coupons
        await deriveCouponStatus();

        for (const item of userData.cart) {
            const variant = item.product.variants.find(v => v.size === item.size);
            if (!variant || variant.stock < item.quantity) {
                stockError = `${item.product.productName} (${item.size}) is out of stock`;
            }
        }

        const validCartItems = userData.cart.filter(item =>
            item.product && item.product.isBlocked === false
        );

        validCartItems.forEach((num) => {
            if (num.quantity > 5) num.quantity = 5;
            priceList.push(num.product.salesPrice * num.quantity);
        });

        const coupons = await Coupon.find({ status: "Active" });
        const constants = await Constants.find({});
        const { shipping, taxes } = constants[0];

        let wallet = await Wallet.findOne({ userId: req.session.user });
        if (!wallet) {
            wallet = new Wallet({ userId: req.session.user, balance: 0 });
            await wallet.save();
        }

        summary.subtotal = priceList.reduce((acc, num) => acc + num, 0);
        summary.taxes = taxes;
        summary.shipping = shipping;
        summary.total = req.session.newTotal ? req.session.newTotal : (summary.subtotal + summary.taxes + summary.shipping);

        const validCoupons = coupons
            .filter((coupon) => coupon.minPurchase <= summary.total)
            .map((coupon) => coupon.code);

        res.status(STATUS_CODES.OK).render("checkout", {
            user: req.session.userName || userName,
            image: null,
            addresses: userData.address,
            cartItems: validCartItems,
            summary: summary,
            stockError: stockError,
            coupons: validCoupons,
            balance: wallet.balance,
            currentCoupon: req.session.coupon || null,
            newTotal: req.session.newTotal || null,
            currentDiscount: req.session.discount || null
        });
    } catch (error) {
        console.error("Error while loading checkout page", error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).redirect("/error");
    }
};

export const applyCoupon = async (req, res) => {
    try {
        const constants = await Constants.find({});
        const { shipping, taxes } = constants[0];
        const { couponCode } = req.body;
        const userId = req.session.user;

        const couponDetails = await Coupon.findOne({ code: couponCode });
        const userDetails = await User.findOne({ _id: userId }).populate("cart.product");

        if (userDetails.redeemedCoupons.includes(couponCode)) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: "This coupon is used up" });
        }

        const validCartItems = userDetails.cart.filter(item => item.product.isBlocked === false);
        if (validCartItems.length === 0) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: "Products no longer available" });
        }

        let totalAmount = validCartItems.reduce((acc, item) => {
            return acc + (item.product.salesPrice * item.quantity);
        }, 0) + taxes + shipping;

        let discountValue = 0;
        if (couponDetails.discountType === "fixed") {
            discountValue = couponDetails.discountValue;
        } else if (couponDetails.discountType === "percentage") {
            discountValue = totalAmount * (couponDetails.discountValue / 100);
            if (discountValue > couponDetails.maxDiscount) discountValue = couponDetails.maxDiscount;
        }

        totalAmount -= discountValue;

        // Save status to session
        req.session.coupon = couponCode;
        req.session.newTotal = totalAmount;
        req.session.discount = discountValue;

        // Update DB
        await User.updateOne({ _id: userId }, { $push: { redeemedCoupons: couponCode } });
        await Coupon.updateOne({ code: couponCode }, { $inc: { redemptions: 1 } });

        return res.status(STATUS_CODES.OK).json({ success: true, newTotal: totalAmount, discount: discountValue });
    } catch (error) {
        console.error("Apply coupon error:", error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: "Something went wrong!" });
    }
};

export const removeCoupon = async (req, res) => {
    try {
        let { code, totalAmount, discount } = req.body;

        req.session.coupon = null;
        req.session.newTotal = null;
        req.session.discount = null;

        const parsedTotal = Number(totalAmount.replace(/[^\d.]/g, ''));
        const parsedDiscount = Number(discount.replace(/[^\d.]/g, ''));
        const newTotal = parsedTotal + parsedDiscount;

        await User.updateOne({ _id: req.session.user }, { $pull: { redeemedCoupons: code } });
        await Coupon.updateOne({ code: code }, { $inc: { redemptions: -1 } });

        res.status(STATUS_CODES.OK).json({
            success: true,
            message: "Coupon removed successfully",
            newTotal,
            discount: 0
        });
    } catch (error) {
        console.error("Remove coupon error: ", error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: "Something went wrong!" });
    }
};

export const addAddress = async (req, res) => {
    try {
        await User.updateOne({ _id: req.session.user }, { $addToSet: { address: req.body } });
        res.status(STATUS_CODES.OK).redirect("/checkout");
    } catch (error) {
        console.error("Error while adding address", error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).redirect("/error");
    }
};

export const editAddress = async (req, res) => {
    try {
        const addressId = req.params.id;
        const { label, street, city, state, country, postalCode, phone, isDefault } = req.body;

        await User.updateOne({ _id: req.session.user, "address._id": addressId }, {
            $set: {
                "address.$.label": label,
                "address.$.street": street,
                "address.$.city": city,
                "address.$.state": state,
                "address.$.country": country,
                "address.$.postalCode": postalCode,
                "address.$.phone": phone,
                "address.$.isDefault": isDefault
            }
        });
        res.status(STATUS_CODES.OK).redirect("/checkout");
    } catch (error) {
        console.error("Error while editing address: ", error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).redirect("/error");
    }
};

/**
 * Helper: Updates coupons to 'Expired' if they hit limits or dates
 */
async function deriveCouponStatus() {
    try {
        const now = new Date();
        const result = await Coupon.updateMany(
            {
                status: "Active",
                $or: [
                    { $expr: { $gte: ["$redemptions", "$usageLimit"] } },
                    { expiryDate: { $lte: now } }
                ]
            },
            { $set: { status: "Expired" } }
        );
        return true;
    } catch (error) {
        console.error("Coupon status management error: ", error);
        return false;
    }
}