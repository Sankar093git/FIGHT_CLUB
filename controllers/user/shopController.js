const Product = require("../../models/productSchema");
const Brand = require("../../models/brandSchema");
const Category = require("../../models/categorySchema");
const User=require("../../models/userSchema");

const loadShopPage = async (req, res) => {
  try {
    const minPrice = req.query.minPrice;
    const maxPrice = req.query.maxPrice;
    const sort = req.query.sort;
    const bran = req.query.bran;
    const cate = req.query.cate;
    const search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 9;
    const skip = (page - 1) * limit;

    // Sorting
    let sortOption = { createdOn: -1 };
    if (sort === "price-asc") {
      sortOption = { salesPrice: 1 };
    } else if (sort === "price-desc") {
      sortOption = { salesPrice: -1 };
    } else if (sort === "asc") {
      sortOption = { productName: 1 };
    } else if (sort === "desc") {
      sortOption = { productName: -1 };
    }

    const regex = new RegExp(search, "i");

    // Base filter
    let filter = { productName: regex,available:true,isBlocked:false };

    // Category filter
    if (cate) {
      const requiredCate = await Category.findOne({ name: cate });
      if (requiredCate) {
        filter.category = requiredCate._id;
      }
    }

    // Brand filter
    if (bran) {
      filter.brand = bran;
    }

    // Price filter
    if (minPrice && maxPrice) {
      filter.salesPrice = { $gte: minPrice, $lte: maxPrice };
    }

    // Fetch products
    const data = await Product.find(filter)
      .sort(sortOption)
      .skip(skip)
      .limit(limit);

    const brand = await Brand.find({});
    const category = await Category.find({});

    const count = await Product.countDocuments(filter);
    const totalPages = Math.ceil(count / limit);

    res.render("shop", {
      user: req.session.userName,
      image:req.session.image,
      product: data,
      brand,
      category,
      totalPages,
      currentPage: page,
      search,
      bran,
      cate,
      sort,
      minPrice,
      maxPrice,
    });
  } catch (error) {
    console.error(error);
    res.redirect("/error");
  }
};

const loadProductDetails=async (req,res)=>{
    try {
        const userId=req.session.user;
        const userData=await User.findOne({_id:userId});
        const user=userData.name;
        const id=req.query.id;
        const data=await Product.findOne({_id:id,isBlocked:false}).populate("category");
        const catId=data.category._id;
        const relatedProducts= await Product.find({category:catId});
        //console.log(userId);
        res.render("productDetails",{
            product:data,
            relatedProducts:relatedProducts,
            user:user,
            image:req.session.image
        });
    } catch (error) {
        console.log(error);
        res.redirect("/admin/error")
    }
}

const addToCart = async (req, res) => {
  try {
    const id = req.params.id;        
    const userId = req.session.user; 
    const result = await User.updateOne(
      { _id: userId, "cart.product": id },
      { $inc: { "cart.$.quantity": 1 } }
    );

    if (result.matchedCount === 0) {
      await User.updateOne(
        { _id: userId },
        { $push: { cart: { product: id, quantity: 1 } } }
      );
    }

    await Product.updateOne({_id:id},{$inc:{quantity:-1}});
    
    res.redirect(`/product/${id}`);

  } catch (error) {
    console.error("Error while adding to cart:", error);
    res.redirect("/error");
  }
};


module.exports={
    loadShopPage,
    loadProductDetails,
    addToCart
    
}