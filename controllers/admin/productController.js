const Product=require("../../models/productSchema");
const Variant=require("../../models/variantSchema");
const Category=require("../../models/categorySchema");
const Brand=require("../../models/brandSchema");
const fs=require("fs");
const path=require("path");
const sharp=require("sharp");

const loadProducts=async(req,res)=>{
    try {
        const search=req.query.search;
        const page=req.query.page;
        const limit=4;
        const skip=(page-1)*limit
        const data= await Product.find({productName:{$regex:new RegExp(search,'i')}}).limit(limit).skip(skip).populate("category");
        const count= await Product.find({}).countDocuments();
        const totalPages=Math.ceil(count/limit);
        res.render("products",{data:data,totalPages:totalPages,currentPage:page});
    } catch (error) {
        console.error("Error while loading the product list",error);
        res.redirect("/admin/error");
    }
}

const getAddProduct=async (req,res)=>{
    try {
        const brand= await Brand.find({isUnlisted:false});
        const category=await Category.find({isListed:true})
        res.render("product-add",{brand:brand,cat:category});
    } catch (error) {
        console.log("Error while loading edit product page",error);
        res.redirect("/admin/error");
    }
}

const addProducts = async (req, res) => {
  try {
    const { productName } = req.body;

    
    const productExists = await Product.findOne({ productName });
    if (productExists) {
      return res.status(400).json("Product already exists");
    }

    
    const uploadDir = path.join(__dirname, "public", "uploads", "product-images");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const images = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const originalImagePath = file.path;
        const resizedImagePath = path.join(uploadDir, file.filename);

        await sharp(originalImagePath)
          .resize({ width: 400, height: 440 })
          .toFile(resizedImagePath);

        images.push(file.filename);
      }
    }

    
    const category = await Category.findOne({ name: req.body.category });
    if (!category) {
      return res.status(400).json("Invalid category name");
    }

    const newProduct = new Product({
      productName,
      description: req.body.description,
      brand: req.body.brand,
      category: category._id,
      regularPrice: req.body.regularPrice,
      salesPrice: req.body.salePrice, 
      createdOn: new Date(),
      quantity: req.body.quantity,
      size: req.body.size,
      color: req.body.color,
      productImage: images,
      status: "Available",
    });

    await newProduct.save();
    return res.redirect("/admin/add-product");

  } catch (error) {
    console.error("Error while adding product:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};


const loadEditProduct= async(req,res)=>{
    try {
        const id=req.query.id;
        const brand=await Brand.find({isUnlisted:false});
        const category=await Category.find({isListed:true});
        const product=await Product.find({_id:id}).populate("category");
        res.render("edit-product",{
            product:product[0],
            cat:category,
            brand:brand
        })
    } catch (error) {
        console.error("Error while loading edit products",error)
    }
}

const editproduct=async(req,res)=>{
    try {
        
        const images=[];
        const id=req.params.id;
        const {productName,brand,description,regularPrice,salesPrice,quantity,category}=req.body;
        const cat= await Category.findOne({name:category})
        const productExists=await Product.findOne({_id:{$ne:id},productName:productName});
        if(productExists){
            res.redirect("/admin/error");
            console.log("Product already exists");
        }else{
         if(req.files&&req.files.length>0){
                for(let i=0;i<req.files.length;i++){
                   const originalImagePath=req.files[i].path;
                   
                   const resizedImagePath=path.join("public","uploads","product-images",req.files[i].filename);
                   await sharp(originalImagePath).resize({width:400,height:440}).toFile(resizedImagePath);
                   images.push(req.files[i].filename);
                }
            }
        await Product.updateOne({_id:id},{$set:{
            productName:productName,
            brand:brand,
            description:description,
            regularPrice:regularPrice,
            salesPrice:salesPrice,
            category:cat._id,
            images:images,
            quantity:quantity
        }})

        res.redirect("/admin/products");
    }
    } catch (error) {
        console.error("Error while editing product",error);
        res.redirect("/admin/error");
    }
}

const deleteImages=async(req,res)=>{
    try {
        const {productId,imageId}=req.body;
        await Product.findByIdAndUpdate(productId,{$pull:{productImage:imageId}});
        const imagePath=path.join(__dirname,"uploads","re-image",`${imageId}`);
        if(fs.existsSync(imagePath)){
            await unlink(imagePath,(err)=>{
                if(err){
                    console.error("Error while deleting image from storage",err)
                }
            })

            console.log(`${imageId} deleted successfully`);
        }else{
            console.log(`${imageId} deletion failed`);
        }

        res.json({status:true});

        
    } catch (error) {
        console.log("Error while deleting image",error);
        res.redirect("/admin/error");
    }
}
module.exports={
    loadProducts,
    getAddProduct,
    addProducts,
    loadEditProduct,
    editproduct,
    deleteImages
}