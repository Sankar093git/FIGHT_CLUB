import User from "../../models/userSchema.js";
import Order from "../../models/orderSchema.js";
import Product from "../../models/productSchema.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import STATUS_CODES from "../../utils/statusCode.js";

dotenv.config();

export const loadHome = async (req, res) => {
    try {
        const mostWanted = await Order.aggregate([
            {
                $match: {
                    paymentStatus: "PAID",
                    status: { $nin: ["Returned", "Cancelled"] }
                }
            },
            { $unwind: "$products" },
            {
                $group: {
                    _id: "$products.product",
                    count: { $sum: "$products.quantity" }
                }
            },
            {
                $lookup: {
                    from: "products",
                    localField: "_id",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },
            { $unwind: "$productDetails" },
            { $sort: { count: -1 } },
            { $limit: 10 },
            {
                $project: {
                    _id: 1,
                    name: "$productDetails.productName",
                    image: { $arrayElemAt: ["$productDetails.productImage", 0] },
                    salePrice: "$productDetails.salesPrice",
                    regularPrice: "$productDetails.regularPrice"
                }
            }
        ]);

        const latestProducts = await Product.find(
            { isBlocked: false },
            { _id: 1, productName: 1, productImage: 1, salesPrice: 1, regularPrice: 1 }
        ).sort({ createdAt: -1 }).limit(7);

        res.status(STATUS_CODES.OK).render("home", {
            mostWanted,
            latestProducts
        });
    } catch (error) {
        console.error("Error while loading homepage", error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).redirect("/error");
    }
};

export const loadSignUp = async (req, res) => {
    try {
        res.status(STATUS_CODES.OK).render("signUp", { message: null });
    } catch (error) {
        console.log('Error while loading page', error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).redirect("/pageNotFound");
    }
};

export const securePassword = async (password) => {
    try {
        const passwordHash = await bcrypt.hash(password, 10);
        return passwordHash;
    } catch (error) {
        console.log("Error while hashing password", error);
    }
};

export const generateOTP = async () => {
    try {
        const otp = Math.floor(1000 + Math.random() * 900000).toString();
        return otp;
    } catch (error) {
        console.error("Error while generating OTP", error);
    }
};

export const sendVerificationMail = async (OTP, referalCode, email) => {
    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASS
            }
        });

        const mailOptions = {
            from: process.env.NODEMAILER_EMAIL,
            to: email,
        };

        if (OTP === null) {
            mailOptions.subject = "Referral promo code";
            mailOptions.text = `Your Referal code is ${referalCode}`;
            mailOptions.html = `<b>Your Referal code: ${referalCode}</b>`;
        } else {
            mailOptions.subject = "Verify your account";
            mailOptions.text = `Your OTP is ${OTP}`;
            mailOptions.html = `<b>Your OTP: ${OTP}</b>`;
        }

        const info = await transporter.sendMail(mailOptions);
        return info.accepted.length > 0;
    } catch (error) {
        console.error("Error while sending verification mail", error);
        return false;
    }
};

export const signUp = async (req, res) => {
    try {
        const { name, email, phone, referedCode, password } = req.body;
        const checkUser = await User.findOne({ email: email });

        if (!checkUser) {
            const passHash = await securePassword(password);
            let profileImage = "default-avatar.jpg";

            if (req.file) {
                profileImage = req.file.filename;
            }

            const referalCode = "REF-" + crypto.randomBytes(4).toString("hex");
            const newUser = new User({
                name,
                email,
                phone,
                password: passHash,
                userImage: profileImage,
                referalCode
            });

            await newUser.save();

            req.session.user = newUser._id;
            req.session.email = newUser.email;
            req.session.image = newUser.userImage;
            req.session.referalCode = referalCode;

            const OTP = await generateOTP();
            if (referedCode) {
                await checkForReferal(referedCode, req.session.email);
            }

            req.session.otp = OTP;
            const mailSent = await sendVerificationMail(OTP, null, email);

            if (mailSent) {
                res.status(STATUS_CODES.OK).redirect("/verify-otp");
            } else {
                console.log("Email verification failed");
            }
        } else {
            res.status(STATUS_CODES.BAD_REQUEST).render("signUp", { message: "User already exists!" });
        }
    } catch (error) {
        console.error("Error while creating account", error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).redirect("/pageNotFound");
    }
};

export const loadLogin = async (req, res) => {
    try {
        res.status(STATUS_CODES.OK).render("login", { message: "" });
    } catch (error) {
        console.error("Error while loading login page", error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).redirect("/error");
    }
};

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const findUser = await User.findOne({ email: email });

        if (!findUser) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ message: "User not found" });
        }

        const isPasswordMatch = await bcrypt.compare(password, findUser.password);

        if (isPasswordMatch) {
            req.session.user = findUser._id;
            req.session.userName = findUser.name;
            req.session.image = findUser.userImage;
            req.session.email = email;
            res.status(STATUS_CODES.OK).redirect("/");
        } else {
            res.status(STATUS_CODES.BAD_REQUEST).render("login", {
                message: "Enter valid credentials"
            });
        }
    } catch (error) {
        console.error("Error while logging in", error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).redirect("/error");
    }
};

export const loadVerifyOtp = async (req, res) => {
    try {
        res.status(STATUS_CODES.OK).render("verify-otp");
    } catch (error) {
        console.error("Error while loading verify otp page", error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).redirect("/error");
    }
};

export const resendOtp = async (req, res) => {
    try {
        const OTP = await generateOTP();
        req.session.otp = OTP;
        const sentMail = await sendVerificationMail(OTP, null, req.session.email);

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

export const verifyOtp = async (req, res) => {
    try {
        const sessionOTP = req.session.otp;
        const { otp } = req.body;
        if (sessionOTP === otp) {
            await User.updateOne({ email: req.session.email }, { $set: { isVerified: 1 } });
            const referalCode = req.session.referalCode;
            const sentMail = await sendVerificationMail(null, referalCode, req.session.email);
            if (sentMail) {
                res.status(STATUS_CODES.OK).json({ success: true, message: "OTP verified successfully, your referral code has been sent!" });
            } else {
                res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: "Unable to send referral code!" });
            }
        } else {
            res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: "Invalid OTP" });
        }
    } catch (error) {
        console.log("Error while otp verification", error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: "Something went wrong!" });
    }
};

export const loadForgotPassword = async (req, res) => {
    try {
        res.status(STATUS_CODES.OK).render("forgot-password");
    } catch (error) {
        console.error("Error while loading forgot password", error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).redirect("/error");
    }
};

export const emailVerification = async (req, res) => {
    try {
        const { email } = req.body;
        const isExists = await User.findOne({ email: email });
        if (isExists) {
            req.session.email = email;
            const OTP = await generateOTP();
            req.session.otp = OTP;
            const sentMail = await sendVerificationMail(OTP, null, email);
            if (sentMail) {
                res.status(STATUS_CODES.OK).json({ success: true, message: "OTP has been sent to your mail!" });
            } else {
                res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: "Unable to send email!" });
            }
        } else {
            res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: "Email does not exist!" });
        }
    } catch (error) {
        console.error("Error while verifying email Id", error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).redirect("/error");
    }
};

export const loadVerifyPassOtp = async (req, res) => {
    try {
        res.status(STATUS_CODES.OK).render("verifypassOtp");
    } catch (error) {
        console.error("Error while loading verify otp page", error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).redirect("/error");
    }
};

export const verifyPassOtp = async (req, res) => {
    try {
        const { otp } = req.body;
        if (otp === req.session.otp) {
            res.status(STATUS_CODES.OK).json({ success: true, message: "OTP successfully verified!" });
        } else {
            res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: "Incorrect OTP" });
        }
    } catch (error) {
        console.error("Error while verifying otp", error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).redirect("/error");
    }
};

export const loadResetPassword = async (req, res) => {
    try {
        res.status(STATUS_CODES.OK).render("reset-password");
    } catch (error) {
        console.error("Error while loading the page", error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).redirect("/error");
    }
};

export const resetPassword = async (req, res) => {
    try {
        const email = req.session.email;
        const { password1, password2 } = req.body;

        if (password1 === password2) {
            const passHash = await securePassword(password2);
            await User.updateOne({ email }, { $set: { password: passHash } });

            req.session.destroy((err) => {
                if (err) {
                    console.error("Session destruction error:", err);
                    return res.redirect("/error");
                }
                return res.status(STATUS_CODES.OK).json({ success: true, redirectUrl: "/login" });
            });
        } else {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false });
        }
    } catch (error) {
        console.error("Error while resetting password:", error);
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false });
    }
};

export const logout = async (req, res) => {
    try {
        req.session.destroy();
        res.status(STATUS_CODES.OK).redirect("/");
    } catch (error) {
        console.error("Error while logging out", error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).redirect("/error");
    }
};

export async function checkForReferal(code, email) {
    const item = await User.findOne({ referalCode: code, isBlocked: false }, { email: 1 });
    if (item) {
        await User.updateOne({ email: email }, { $set: { referedBy: item.email } });
    }
}

export const applyReferalCode = async (req, res) => {
    try {
        const { code } = req.body;
        const referee = await User.findOne({ referalCode: code }, { _id: 1, email: 1 });
        const user = await User.findOne({ _id: req.session.user });

        if (!referee) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: "Invalid referral code!" });
        }

        if (user.referedBy) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: "You have been referred already!" });
        }

        user.referedBy = referee.email;
        await user.save();

        res.status(STATUS_CODES.OK).json({ success: true });
    } catch (error) {
        console.error("Referral code error: ", error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: "Something went wrong!" });
    }
};