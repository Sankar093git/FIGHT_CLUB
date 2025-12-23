
const User=require("../models/userSchema");

const navbarContext = async (req, res, next) => {
  try {
    res.locals.isLoggedIn = false;
    res.locals.userName = null;
    res.locals.profileImage = null;
    res.locals.cartCount = 0;

    if (!req.session.user) return next();

    const user = await User.findById(req.session.user)
      .select("name userImage cart")
      .populate({
        path: "cart.product",
        select: "isBlocked"
      });

    if (!user) return next();

    res.locals.isLoggedIn = true;
    res.locals.userName = user.name;
    res.locals.profileImage = user.userImage || "default-avatar.jpg";

    res.locals.cartCount = user.cart
      .filter(item => item.product && item.product.isBlocked === false)
      .reduce((total, item) => total + item.quantity, 0);

    next();
  } catch (err) {
    console.error("Navbar context middleware error:", err);
    next();
  }
};

module.exports = navbarContext;