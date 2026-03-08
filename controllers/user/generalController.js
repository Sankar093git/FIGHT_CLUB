
const STATUS_CODES=require("../../utils/statusCode");

const pageNotFound=async(req,res)=>{
    try {
         res.status(STATUS_CODES.NOT_FOUND).render("page-not-found")
    } catch (error) {
       console.error(error);
    }
}

module.exports={
    pageNotFound
}