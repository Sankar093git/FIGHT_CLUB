const Category=require("../../models/categorySchema");

const loadCategory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 4;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";

    const searchFilter = {
      name: { $regex: new RegExp(search, 'i') },
      isDeleted:0
    
    };

    const categoryData = await Category.find({name: { $regex: new RegExp(search, 'i') },isDeleted:false})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalCategories = await Category.countDocuments({name: { $regex: new RegExp(search, 'i') },isDeleted:false});
    const totalPages = Math.ceil(totalCategories / limit);

    res.render("category", {
      cat: categoryData,
      currentPage: page,
      totalPages,
      totalCategories,
      search:search
    });
  } catch (error) {
    console.error("Error loading categories:", error);
    res.redirect("/admin/error");
  }
};


const addCategory = async (req, res) => {
  try {
    const { name, description } = req.body;

    const isExists = await Category.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      isDeleted:false
    });

    if (isExists) {
      return res.status(400).json({ error: "Category already exists" });
    }

    
    const formattedName = name.charAt(0).toUpperCase() + name.slice(1);

    const newCategory = new Category({
      name: formattedName,
      description
    });

    await newCategory.save();
    return res.status(201).json({ message: "Category added successfully" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "Something went wrong, please try again" });
  }
};

const addOffer = async (req, res) => {
  try {
    const percentage = parseFloat(req.body.percentage);
    const categoryId = req.body.categoryId;

    console.log("Received percentage and categoryId:", percentage, categoryId);

    if(percentage>99||percentage<0||isNaN(percentage)){
        return res.status(400).json({status:false,message:"Forbidden input"});
    }

    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ status: false, message: "Category not found" });
    }

    await Category.updateOne({ _id: categoryId }, { $set: { categoryOffer: percentage } });

    res.json({ status: true });

  } catch (error) {
    console.log("Backend error", error);
    res.status(500).json({ status: false, message: "Internal Server Error" });
  }
}

const removeOffer = async (req, res) => {
  try {
    const categoryId = req.body.categoryId;

    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ status: false, message: "Category not found" });
    }

    await Category.updateOne({ _id: categoryId }, { $set: { categoryOffer: 0 } });

    res.json({ status: true });

  } catch (error) {
    console.error("Backend error while removing offer:", error);
    res.status(500).json({ status: false, message: "Internal Server Error" });
  }
};

const listOrUnlist= async (req,res)=>{
  try {
    let id=req.params.id;
    const category=await Category.findOne({_id:id});
    if(category.isListed){
       await Category.updateOne({_id:id},{$set:{isListed:false}}); 
       return res.status(200).json({success:true,message:"Category unlisted"})
    }else{
        await Category.updateOne({_id:id},{$set:{isListed:true}});
        return res.status(200).json({success:true,message:"Category listed"})
    }
  } catch (error) {
    console.error("Error while handling category listing",error);
    res.status(500).json({success:false,message:"Something went wrong!"});
  }
}

const loadEditCategory=async (req,res)=>{
  try {
    const id=req.query.id;
    const category=await Category.findOne({_id:id});
    res.render("edit-category",{category:category});
  } catch (error) {
    console.log("edit category error",error);
    res.status(500).redirect("/pageerror");
  }
}

const editCategory=async(req,res)=>{
  try {
    const id=req.params.id;
    const {categoryName,description}=req.body;
    const existingCategory= await Category.findOne({name:`/${categoryName}/i`});
    if(existingCategory){
     return res.status(400).json({error:"Category exits please choose another name"});
    }
    await Category.findByIdAndUpdate(id,{name:categoryName,description:description});
    res.redirect("/admin/category");
  } catch (error) {
    console.log(error)
    res.status(500).json({error:"Internal server error"});
  }
}

const deleteCategory=async(req,res)=>{
    try {
        const id=req.params.id;
        await Category.findByIdAndUpdate(id,{isDeleted:true});
        res.status(200).json({success:true});
        
    } catch (error) {
        console.error("Error wile deleting category");
        res.status(500).json({success:false});
    }
}

module.exports={
    loadCategory,
    addCategory,
    addOffer,
    removeOffer,
    listOrUnlist,
    loadEditCategory,
    editCategory,
    deleteCategory
}