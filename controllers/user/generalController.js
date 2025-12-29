
const pageNotFound=async(req,res)=>{
    try {
         res.status(404).render("page-not-found")
    } catch (error) {
       console.error(error);
    }
}

module.exports={
    pageNotFound
}