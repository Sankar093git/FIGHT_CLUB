const User = require("../../models/userSchema");
const bcrypt = require("bcrypt");
const Contants = require("../../models/constantSchema");
const STATUS_CODES = require("../../utils/statusCode");


const loadLogin = async (req, res) => {
    try {
        res.status(STATUS_CODES.OK).render("adminLogin", { message: null });
    } catch (error) {
        console.log("Error while loading the login page", error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).redirect("/adminerror");
    }
}

const loadDashboard = async (req, res) => {
    try {
        const constants = await Contants.find();
        let shipping = constants[0].shipping;
        let taxes = constants[0].taxes;
        res.status(STATUS_CODES.OK).render("dashboard", {
            shipping,
            taxes
        });
    } catch (error) {
        console.error("Error while loading dashboard", error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).redirect("/adminerror");
    }
}

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const findUser = await User.findOne({ email: email, isAdmin: 1 });
        if (findUser) {
            req.session.admin = findUser._id;
            const passMatch = await bcrypt.compare(password, findUser.password);
            if (passMatch) {
                res.status(STATUS_CODES.OK).redirect("/admin");
            } else {
                res.status(STATUS_CODES.UNAUTHORIZED).render("adminLogin", { message: "Please enter the correct credentials" })
            }
        } else {
            res.status(STATUS_CODES.UNAUTHORIZED).render("adminLogin", { message: "User not found" });
        }
    } catch (error) {
        console.error("Error while login in", error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).render("adminLogin", { message: "Something went wrong, please try again." });
    }
}

const logout = async (req, res) => {
    try {
        req.session.destroy((err) => {
            if (err) {
                console.error(err);
            }
        });
        res.status(STATUS_CODES.OK).redirect("/admin/login");
    } catch (error) {
        console.error("Error while logging out", error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).redirect("/admin/error")
    }
}


module.exports = {
    loadLogin,
    login,
    loadDashboard,
    logout
}