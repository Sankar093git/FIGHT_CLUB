const User = require("../models/userSchema");
const STATUS_CODES=require("../utils/statusCode");

const userAuth = async (req, res, next) => {
  try {
    if (req.session && req.session.user) {
      const userData = await User.findOne({ _id: req.session.user });
      
      if (userData && userData.isBlocked === false) {
        return next();
      } else {
        return res.status(STATUS_CODES.REDIRECT).redirect("/");
      }
    } else {
      return res.status(STATUS_CODES.REDIRECT).redirect("/");
    }
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).redirect("/error");
  }
};

const userAuth1 = async (req, res, next) => {
  try {
    if (req.session.user) {
      return res.status(STATUS_CODES.REDIRECT).redirect("/");
    }
    next();
  } catch (error) {
    console.error("Redirect middleware error:", error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).redirect("/error");
  }
};

const adminAuth = async (req, res, next) => {
  try {
    if (req.session.admin) {
      next();
    } else {
      res.status(STATUS_CODES.REDIRECT).redirect("/admin/login");
    }
  } catch (error) {
    console.error("Admin Auth error:", error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).redirect("/adminerror");
  }
};

const adminAuth1 = async (req, res, next) => {
  try {
    if (req.session.admin) {
      res.status(STATUS_CODES.REDIRECT).redirect("/admin");
    } else {
      next();
    }
  } catch (error) {
    console.error("Admin Redirect error:", error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).redirect("/adminerror");
  }
};

module.exports = {
  userAuth,
  userAuth1,
  adminAuth,
  adminAuth1
};