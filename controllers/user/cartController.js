const User = require("../../models/userSchema");
const STATUS_CODES = require("../../utils/statusCode");

const loadCart = async (req, res) => {
  try {
    const user = req.session.user;
    const userData = await User.findOne({ _id: user }).populate("cart.product");
    let hasStockIssue = false;
    userData.cart = userData.cart.map((item) => {
      const product = item.product;
      const variant = product.variants.find(v => v.size == item.size);
      if (!variant || item.quantity > variant.stock) {
        hasStockIssue = true;
        return {
          ...item.toObject(),
          stockError: true,
          availableStock: variant ? variant.stock : 0
        }
      } else {
        return {
          ...item.toObject(),
          stockError: false,
          availableStock: variant ? variant.stock : 0
        }
      }
    })
    const validCartItems = userData.cart.filter(item => item.product.isBlocked === false);
    const dbCartUpdate = validCartItems.map(item => ({
      product: item.product._id,
      size: item.size,
      quantity: item.quantity
    }));
    await User.updateOne({ _id: user }, { $set: { cart: dbCartUpdate } })
    res.status(STATUS_CODES.OK).render("cart", {
      userData: userData,
      cart: validCartItems,
      user: userData.name,
      image: req.session.image,
    });
  } catch (error) {
    console.error("Error while loading cart-page", error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).redirect("/error");
  }
}

const changeQuantity = async (req, res) => {
  try {
    const userData = await User.findOne({ _id: req.session.user }).populate("cart.product");
    const action = req.body.action;
    const pId = req.body.id;

    const cartItem = userData.cart.find(item => item.product._id.toString() === pId);
    const size = cartItem.size;
    const variant = cartItem.product.variants.find(v => v.size == size);
    if (!cartItem) {
      console.log("Product not found in cart");
      return;
    }
    if (action === 'increment') {
      if (cartItem.quantity >= variant.stock) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: "Out of stock" });
      } else if (cartItem.quantity >= 5) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: "Limit exceeded" });
      } else {
        await User.updateOne(
          { _id: req.session.user, "cart.product": pId },
          { $inc: { "cart.$.quantity": 1 } }
        );
        return res.status(STATUS_CODES.OK).json({ success: true });
      }
    } else if (action === "decrement") {
      if (cartItem.quantity <= 1) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: "Click trash icon to remove the product" });
      } else {
        await User.updateOne(
          { _id: req.session.user, "cart.product": pId },
          { $inc: { "cart.$.quantity": -1 } }
        );
      }
      return res.status(STATUS_CODES.OK).json({ success: true });
    }

  } catch (error) {
    console.error("Error while changing quantity", error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).redirect("/error");
  }
}

const removeItem = async (req, res) => {
  try {
    const pId = req.body.product;
    await User.updateOne(
      { _id: req.session.user },
      { $pull: { cart: { product: pId } } }
    );
    res.status(STATUS_CODES.OK).json({ success: true });
  } catch (error) {
    console.error("Error while removing item", error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).redirect("/error");
  }
};


module.exports = {
  loadCart,
  changeQuantity,
  removeItem
}