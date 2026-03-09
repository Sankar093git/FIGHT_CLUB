import Constants from "../../models/constantSchema.js";
import STATUS_CODES from "../../utils/statusCode.js";

export const addConstants = async (req, res) => {
    try {
        const { shippingRate, taxRate } = req.body;

        const constant = await Constants.find({});

        if (constant.length === 0) {
            const newConstants = new Constants({
                shipping: shippingRate,
                taxes: taxRate
            });

            await newConstants.save();
        } else {
            constant[0].shipping = shippingRate;
            constant[0].taxes = taxRate;

            await constant[0].save();
        }

        res.status(STATUS_CODES.OK).json({
            success: true,
            message: "Constants added successfully!"
        });
    } catch (error) {
        console.error("Constant creation : ", error);

        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Something went wrong!"
        });
    }
};