const Constants=require("../../models/constantSchema");


const addConstants = async (req,res) =>{
    try {
        const{shippingRate,taxRate}=req.body;

        const constant = await Constants.find({});

        if(!constant){

            const newConstants= new Constants({
                shipping:shippingRate,
                taxes:taxRate
            });

            await newConstants.save();

        }else{

            constant[0].shipping=shippingRate;

            constant[0].taxes=taxRate;

            await constant[0].save();

        }

        res.status(200).json({
            success:true,
            message:"Constants added successfully!"
        });
    } catch (error) {

        console.error("Constant creation : ",error);

        res.status(500).json({
            success:false,
            message:"Something went wrong!"
        });

    }
    
}

module.exports={
    addConstants
}