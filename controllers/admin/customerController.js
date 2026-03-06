const User=require("../../models/userSchema");
const bcrypt=require("bcrypt");

const loadCustomer= async(req,res)=>{
    try {

        const search=req.query.search||" ";

        const page=req.query.page||1;

        const limit=4;

        const skip=(page-1)*limit;

        const totalData=await User.find();

        const userData= await User.find({isDeleted:0,isAdmin:0,$or:[
                {name:{$regex:".*"+search+".*",$options:"i"}},
                {email:{$regex:".*"+search+".*",$options:"i"}}
            ]}).skip(skip).limit(limit);

        const count=await User.find({isDeleted:0,isAdmin:0,$or:[
                {name:{$regex:".*"+search+".*",$options:"i"}},
                {email:{$regex:".*"+search+".*",$options:"i"}}
            ]}).countDocuments();

        const totalPages=Math.ceil(count/limit);

        res.status(200).render("customer",{
            queryVal:req.query,
            totalData:totalData,
            data:userData||null,
            totalPages:totalPages,
            totalCount:count,
            currentPage:page
        });

    } catch (error) {

        console.error("Error while loading customerlist",error);

        res.status(500).redirect("/admin/error");

    }

}

const blockOrUnblockCustomer=async(req,res)=>{
    try {

        const id=req.query.id;

        const userData=await User.findById(id);

        let blockedUsers;
        let activeUsers;

        if(userData.isBlocked){

            await User.updateOne({_id:id},{$set:{isBlocked:false}});

            blockedUsers=await User.countDocuments({isBlocked:true});

            activeUsers= await User.countDocuments({isBlocked:false});

            res.status(200).json({
                success:true,
                status:"unblocked",
                blockedUsers,
                activeUsers,
                message:`${userData.name} has been unblocked`
            });

        }else{

            await User.updateOne({_id:id},{$set:{isBlocked:true}});

            blockedUsers=await User.countDocuments({isBlocked:true});

            activeUsers= await User.countDocuments({isBlocked:false});


            res.status(200).json({
                success:true,
                status:"blocked",
                blockedUsers,
                activeUsers,
                message:`${userData.name} has been blocked`
            });

        }
         
    } catch (error) {

        console.error("Error while blocking customer",error);

        res.status(500).json({
            success:false,
            message:"Something went wrong, please try again."
        });

    }
    
}


module.exports={
    loadCustomer,
    blockOrUnblockCustomer,
}