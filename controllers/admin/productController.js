const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Brand = require("../../models/brandSchema");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const STATUS_CODES = require("../../utils/statusCode");


const loadProducts = async (req, res) => {
  try {

    const prod = req.query.prod || "";
    const cate = req.query.cate || "";
    const brand = req.query.brand || "";
    const page = req.query.page || 1;

    const category = await Category.find({ name: { $regex: new RegExp(cate, 'i') } });
    const catIds = category.map((item) => item._id);
    const limit = 4;

    const skip = (page - 1) * limit;

    const data = await Product.find({

      productName: { $regex: new RegExp(prod, 'i') },
      category: { $in: catIds },
      brand: { $regex: new RegExp(brand, 'i') }
    })
      .limit(limit)
      .skip(skip)
      .populate("category");

    const count = await Product.find({}).countDocuments({
      productName: { $regex: new RegExp(prod, 'i') },
      category: { $in: catIds },
      brand: { $regex: new RegExp(brand, 'i') }
    });

    const totalPages = Math.ceil(count / limit);

    res.status(STATUS_CODES.OK).render("products", {
      queryVal: req.query,
      data: data,
      totalPages: totalPages,
      currentPage: page
    });

  } catch (error) {

    console.error("Error while loading the product list", error);

    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).redirect("/admin/error");

  }
}

const getAddProduct = async (req, res) => {
  try {

    const brand = await Brand.find({ isUnlisted: false });

    const category = await Category.find({ isListed: true });

    res.status(STATUS_CODES.OK).render("product-add", {
      brand: brand,
      cat: category
    });

  } catch (error) {

    console.log("Error while loading edit product page", error);

    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).redirect("/admin/error");

  }

}

const addProducts = async (req, res) => {
  try {

    const { productName } = req.body;

    const v = JSON.parse(req.body.variants);

    const quantity = v.map((v) => parseInt(v.stock)).reduce((acc, num) => acc + num, 0);

    const productExists = await Product.findOne({ productName });

    if (productExists) {

      return res.status(STATUS_CODES.BAD_REQUEST).json("Product already exists");

    }

    const uploadDir = path.join(process.cwd(), "public", "uploads", "re-image");

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const images = [];

    if (req.files && req.files.length > 0) {

      for (const file of req.files) {

        const originalImagePath = file.path;
        const resizedImagePath = path.join(uploadDir, "R" + file.filename);

        await sharp(originalImagePath)
          .resize({ width: 400, height: 440 })
          .toFile(resizedImagePath);

        images.push("R" + file.filename);

      }

    }


    const category = await Category.findOne({ name: req.body.category });

    if (!category) {

      return res.status(STATUS_CODES.BAD_REQUEST).json("Invalid category name");

    }

    const newProduct = new Product({
      productName,
      description: req.body.description,
      brand: req.body.brand,
      category: category._id,
      regularPrice: req.body.regularPrice,
      ogSalesPrice: req.body.salePrice,
      salesPrice: req.body.salePrice,
      quantity: quantity,
      createdOn: new Date(),
      variants: JSON.parse(req.body.variants),
      size: req.body.size,
      color: req.body.color,
      productImage: images,
      status: "Available",
    });

    await newProduct.save();

    return res.status(STATUS_CODES.CREATED).json({
      success: true
    });

  } catch (error) {

    console.error("Error while adding product:", error);

    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Internal Server Error"
    });

  }

}


const loadEditProduct = async (req, res) => {
  try {

    const id = req.query.id;

    const brand = await Brand.find({ isUnlisted: false });

    const category = await Category.find({ isListed: true });

    const product = await Product.find({ _id: id }).populate("category");

    res.status(STATUS_CODES.OK).render("edit-product", {
      product: product[0],
      variants: product[0].variants,
      cat: category,
      brand: brand
    });

  } catch (error) {

    console.error("Error while loading edit products", error)

    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).redirect("/admin/error");

  }

}

const editproduct = async (req, res) => {
  try {
    const images = [];

    const id = req.params.id;

    const { productName,
      brand,
      description,
      regularPrice,
      salePrice,
      category,
      variants } = req.body;


    let variant = JSON.parse(variants);

    let quantity = variant.map((n) => n.stock).reduce((acc, n) => acc + n, 0);


    const cat = await Category.findOne({ name: category });

    const productExists = await Product.findOne({ _id: { $ne: id }, productName });

    if (productExists) {

      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: "Product already exists"
      });

    }

    // Process new uploaded images
    if (req.files && req.files.length > 0) {

      for (let i = 0; i < req.files.length; i++) {

        const originalImagePath = req.files[i].path;

        // Create NEW filename for resized image
        const newFileName = "re-" + Date.now() + "-" + req.files[i].filename;

        const resizedImagePath = path.join("public", "uploads", "re-image", newFileName);

        await sharp(originalImagePath)
          .resize({ width: 400, height: 440 })
          .toFile(resizedImagePath);


        images.push(newFileName);

      }

    }

    await Product.updateOne(
      { _id: id },
      {
        $set: {
          productName,
          brand,
          description,
          regularPrice,
          salesPrice: salePrice,
          variants: JSON.parse(variants),
          category: cat._id,
          quantity
        },
        $push: {
          productImage: { $each: images }
        }
      });

    res.status(STATUS_CODES.OK).json({
      success: true,
      message: "Product edited successfully"
    });

  } catch (error) {

    console.error("Error while editing product", error);

    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Something went wrong!"
    });

  }

}


const deleteImages = async (req, res) => {
  try {
    const imageId = req.params.id;

    const { productId } = req.body;

    await Product.findByIdAndUpdate(productId, { $pull: { productImage: imageId } });

    const imagePath = path.join(process.cwd(), "uploads", "re-image", `${imageId}`);

    if (fs.existsSync(imagePath)) {

      await fs.unlink(imagePath, (err) => {
        if (err) {
          console.error("Error while deleting image from storage", err)
        }
      });

      console.log(`${imageId} deleted successfully`);

    } else {

      console.log(`${imageId} deletion failed`);
    }

    res.status(STATUS_CODES.OK).json({ success: true });


  } catch (error) {
    console.log("Error while deleting image", error);

    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).redirect("/admin/error");
  }
}

const blockOrUnblockproduct = async (req, res) => {
  try {
    const productId = req.params.id;

    const prodDetails = await Product.findOne({ _id: productId });

    if (prodDetails.isBlocked == true) {

      await Product.updateOne({ _id: productId }, { $set: { isBlocked: false } });

      return res.status(STATUS_CODES.OK).json({
        success: true,
        isBlocked: false,
        message: "Product has been unblocked!"
      });

    } else {

      await Product.updateOne({ _id: productId }, { $set: { isBlocked: true } });

      return res.status(STATUS_CODES.OK).json({
        success: true,
        isBlocked: true,
        message: "Product has been blocked!"
      });

    }

  } catch (error) {

    console.error("Error while blocking product", error);

    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false
    });

  }

}

const addOffer = async (req, res) => {
  try {
    const { percentage, productId } = req.body;

    const productDetails = await Product.findOne({ _id: productId }).populate("category");

    const discount = productDetails.ogSalesPrice * (parseInt(percentage) / 100);

    if (productDetails.category.categoryOffer === 0 || productDetails.category.categoryOffer < percentage) {

      productDetails.salesPrice = productDetails.ogSalesPrice - discount;

      productDetails.productDiscount = discount;

      productDetails.offer = parseInt(percentage);

      await productDetails.save();

      return res.status(STATUS_CODES.OK).json({
        success: true,
        price: productDetails.ogSalesPrice - discount,
        message: "Offer has been added!"
      });

    }

    res.status(STATUS_CODES.BAD_REQUEST).json({
      success: false,
      message: "Please add an offer greater than category offer!"
    });

  } catch (error) {

    console.log("Product offer: ", error);

    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Something went wrong"
    });

  }
}

const removeOffer = async (req, res) => {
  try {
    const { productId } = req.body;

    const productDetails = await Product.findOne({ _id: productId }).populate("category");

    if (productDetails.offer === 0) {

      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: "Offer does not exist"
      });

    }
    productDetails.salesPrice = productDetails.ogSalesPrice;

    let price = productDetails.ogSalesPrice;

    productDetails.offer = 0;

    productDetails.productDiscount = 0;

    if (productDetails.category.categoryOffer > 0) {

      let discount = productDetails.ogSalesPrice * (productDetails.category.categoryOffer / 100);

      productDetails.salesPrice = productDetails.ogSalesPrice - discount;

      productDetails.categoryDiscount = discount;

    }

    await productDetails.save();

    res.status(STATUS_CODES.OK).json({
      success: true,
      price,
      message: "Offer has been removed"
    })

  } catch (error) {

    console.log("Remove offer error: ", error);

    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Something went wrong"
    });

  }

}
module.exports = {
  loadProducts,
  getAddProduct,
  addProducts,
  loadEditProduct,
  editproduct,
  deleteImages,
  blockOrUnblockproduct,
  addOffer,
  removeOffer
}