import User from '../models/userSchema.js';

const navbarContext = async (req, res, next) => {
  try {
    // Initialize default values for the templates
    res.locals.isLoggedIn = false;
    res.locals.userName = null;
    res.locals.profileImage = null;
    res.locals.cartCount = 0;

    // If no user session, move to the next middleware/route
    if (!req.session.user) return next();

    // Fetch user with selective fields and populate cart to check product status
    const user = await User.findById(req.session.user)
      .select('name userImage cart wishlist')
      .populate({
        path: 'cart.product',
        select: 'isBlocked',
      });

    if (!user) return next();

    const fullUser = await User.findById(req.session.user).select('isVerified isBlocked');
    if (!fullUser.isVerified || fullUser.isBlocked) {
      req.session.user = null;
      return next();
    }

    res.locals.isLoggedIn = true;
    res.locals.userName = user.name;
    res.locals.profileImage = user.userImage || 'default-avatar.jpg';

    // Calculate cart count excluding blocked products
    res.locals.cartCount = user.cart
      .filter((item) => item.product && item.product.isBlocked === false)
      .reduce((total, item) => total + item.quantity, 0);

    res.locals.wishCount = user.wishlist.length || 0;

    next();
  } catch (err) {
    console.error('Navbar context middleware error:', err);
    // Continue even if there's an error to avoid breaking the page load
    next();
  }
};

export default navbarContext;
