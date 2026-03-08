const Product = require("../../models/productSchema");
const Brand = require("../../models/brandSchema");
const Category = require("../../models/categorySchema");
const User=require("../../models/userSchema");
const STATUS_CODES=require("../../utils/statusCode");

const loadShopPage = async (req, res) => {
  try {
    let userName=null;
    if(req.session.google==true){
      const userDetails= await User.findOne({_id:req.session.user});
      userName=userDetails.name;
    }
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
    let filter = { productName: regex,available:true,isBlocked:false};

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

    res.status(STATUS_CODES.OK).render("shop", {
      user: req.session.userName||userName,
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
        res.status(STATUS_CODES.OK).render("productDetails",{
            product:data,
            relatedProducts:relatedProducts,
            user:user,
            image:req.session.image
        });
    } catch (error) {
        console.log(error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).redirect("/admin/error");
    }
}

const addToCart = async (req, res) => {
  try {
    console.log(req.body)
    const id = req.params.id;
    const size=req.body.size;        
    const userId = req.session.user;
    const productDetails=await Product.findOne({_id:id});
    const userData= await User.findOne({_id:req.session.user}).populate("cart.product");
    const cartData=userData.cart;
    let prod=cartData.find(v=>v.product._id==id);
    const item=productDetails.variants.find(v=>v.size===size);
    if(item.stock<1){
      return res.status(STATUS_CODES.BAD_REQUEST).json({success:false,message:"Item out of stock!"});
    }

    if(prod){
      if(prod.quantity==item.stock){
        return res.status(STATUS_CODES.BAD_REQUEST).json({success:false,message:"Item out of stock!"});
      }
      if(prod.product.isBlocked){
        return res.status(STATUS_CODES.BAD_REQUEST).json({success:false,message:"Item out of stock!"});
      }
    }
    
    const result = await User.updateOne(
      { _id: userId, "cart.product": id,"cart.size":size},
      { $inc: { "cart.$.quantity": 1 } }
    );

    if (result.matchedCount === 0) {
      await User.updateOne(
        { _id: userId },
        { $push: { cart: { product: id,size:size, quantity: 1 } } }
      );
    }  
    res.status(STATUS_CODES.OK).redirect(`/product/${id}`);
  } catch (error) {
    console.error("Error while adding to cart:", error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).redirect("/error");
  }
};

const addTowishlist=async(req,res)=>{
  try {
    const userId=req.session.user;
    const prodId=req.params.id;
    const userData=await User.findOne({_id:userId});
    const wishlist=userData.wishlist;
    const prodExists=wishlist.find((prod)=>prod.product==prodId);
    if(prodExists){
      return res.status(STATUS_CODES.CONFLICT).json({success:true,message:"Product already in wishlist"})
    }else{
      await User.updateOne({_id:userId},{$push:{wishlist:{product:prodId}}});
      return res.status(STATUS_CODES.OK).json({success:true,message:"Product added to wishlist"})
    }
  } catch (error) {
    console.error(error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({success:false,message:"Something went wrong!"});
  }
}

const removeFromWishlist=async(req,res)=>{
  try {
    const productId=req.params.id;
    await User.updateOne({_id:req.session.user},{ $pull: { wishlist: { product: productId } } });
    res.status(STATUS_CODES.OK).json({success:true});
  } catch (error) {
    console.error("Error while removing item from wishlist",error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({success:false,message:"Something went wrong, please try again!"});
  }
}


module.exports={
    loadShopPage,
    loadProductDetails,
    addToCart,
    addTowishlist,
    removeFromWishlist
    
}