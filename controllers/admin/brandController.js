const Brand=require("../../models/brandSchema");

const getBrandList=async(req,res)=>{
    try {
        const page=parseInt(req.query.page)||1;
        const limit=4;
        const skip=(page-1)*limit;
        const data= await Brand.find().skip(skip).limit(limit);
        const totalDocuments = await Brand.countDocuments();
        const totalpages=Math.ceil(totalDocuments/limit);
        res.render("brand",{
            count:totalDocuments,
            data:data,
            totalPages:totalpages,
            currentPage:page
        });
    } catch (error) {
        console.error("Error while loading brands",error);
        res.redirect("/admin/error");
    }
}

const addBrand=async (req,res)=>{
    try {
       const name =req.body.name;
       const image=req.file.filename;
       const findBrand=await Brand.findOne({brandName:name});
       if(findBrand){
         if(image){
            await Brand.updateOne({brandName:name},{$set:{brandName:name,logo:image}});
            return res.json({ success: true, message: "Brand edited successfully!" });
         }else{
            await Brand.updateOne({brandName:name},{$set:{brandName:name}});
            return res.json({ success: true, message: "Brand edited successfully!" });
         }
       }else{
       const newBrand= new Brand({
        brandName:name,
        logo:image
       });
       await newBrand.save();
       const brand= await Brand.findOne({brandName:name});
       return res.json({ 
        success: true, 
        message: "Brand added successfully!",
        brand:brand
    }); 
    }  
    } catch (error) {
        console.error("Error while adding brand",error);
        res.json({ success: false, message: "Error adding brand" });
    }
}

const deleteBrand=async (req,res)=>{
    try {
        const id=req.params.id;
        await Brand.deleteOne({_id:id});
        res.status(200).json({success:true,message:"Brand deletion complete!"});
    } catch (error) {
        console.error("Error while deleting brand",error);
        res.status(500).json({success:false,message:"Something went wrong, please try again"})
    }
}

const blockORunblockBrand= async (req,res)=>{
    try {
        const id=req.params.id;
        const findBrand= await Brand.findOne({_id:id});
        if(findBrand.isBlocked){
            await Brand.updateOne({_id:id},{$set:{isBlocked:false}});
            return res.status(200).json({success:true,message:"Unblocked"});           
        }else{
           await Brand.updateOne({_id:id},{$set:{isBlocked:true}}); 
           return res.status(200).json({success:true,message:"Blocked"}); 
        }
    } catch (error) {
        console.error("Error while blocking a brand",error);
        res.status(500).json({success:false,message:"Something went wrong!"});
    }
}

module.exports={
    getBrandList,
    addBrand,
    deleteBrand,
    blockORunblockBrand
}