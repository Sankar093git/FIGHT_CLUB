const Brand=require("../../models/brandSchema");

const getBrandList=async(req,res)=>{
    try {
        const page=parseInt(req.query.page)||1;
        const limit=4;
        const skip=(page-1)*limit;
        const data= await Brand.find().skip(skip).limit(limit);
        const totalDocuments=data.length;
        const totalpages=totalDocuments/limit;
        res.render("brand",{
            data:data,
            totalPages:totalpages,
            currentPage:page
        });
        console.log(data);
    } catch (error) {
        console.error("Error while loading brands",error);
        res.redirect("/admin/error");
    }
}

const addBrand=async (req,res)=>{
    try {
       const name =req.body.name;
       const image=req.file.filename;
       const newBrand= new Brand({
        brandName:name,
        logo:image
       });
       await newBrand.save();
       res.redirect("/admin/brands");    
    } catch (error) {
        console.error("Error while adding brand",error);
        res.redirect("/admin/error");
    }
}

module.exports={
    getBrandList,
    addBrand
}