import User from "../models/userSchema.js";
import STATUS_CODES from "../utils/statusCode.js";

// Middleware to protect routes that require a logged-in (and unblocked) user
export const userAuth = async (req, res, next) => {
  try {
    if (req.session && req.session.user) {
      const userData = await User.findOne({ _id: req.session.user });

      if (userData && !userData.isBlocked) {
        return next();
      } else {
        // If user is blocked or doesn't exist, clear session and redirect
        req.session.user = null;
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

// Middleware to prevent logged-in users from accessing Login/Signup pages
export const userAuth1 = async (req, res, next) => {
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

// Middleware to protect admin routes
export const adminAuth = async (req, res, next) => {
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

// Middleware to prevent logged-in admins from accessing the admin login page
export const adminAuth1 = async (req, res, next) => {
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