const Order = require("../../models/orderSchema");
const Transactions = require("../../models/transactionSchema");
const STATUS_CODES = require("../../utils/statusCode");


const loadSalesReport = async (req, res) => {
    try {
        const { startDate, endDate } = req.body;
        let totalSalesCount = 0;
        const start = new Date(startDate);
        const end = new Date(endDate);
        console.log(start, "---", end);
        const orderDetails = await Order.find({ createdAt: { $gte: start, $lte: end } }).populate("user");
        console.log("Sample order : ", orderDetails.length);

        if (orderDetails.length === 0) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: "No orders have been made yet!" });
        }

        //calculating total sales count

        totalSalesCount = await Order.countDocuments({
            createdAt: { $gte: start, $lte: end },
            paymentStatus: "PAID",
            status: { $nin: ["Returned", "Cancelled"] }

        });

        if (totalSalesCount === 0) {
            res.status(STATUS_CODES.OK).json({
                success: true, message: {
                    totalSalesCount: 0,
                    totalOrderAmount: 0,
                    totalRefund: 0,
                    totalDiscount: 0
                }, orders: orderDetails
            });
        }

        console.log("Total sales : ", totalSalesCount);

        //calculating total amount

        let [{ totalOrderAmount }] = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: start, $lte: end },
                    paymentStatus: "PAID",
                    status: { $nin: ["Returned", "Cancelled"] }
                }
            },
            {
                $group: {
                    _id: null,
                    totalOrderAmount: { $sum: "$totalAmount" }
                }
            },
            {
                $project: {
                    _id: 0
                }
            }
        ]);

        //Calculating total offer discount
        let [{ totalOfferDiscount }] = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: start, $lte: end },
                    paymentStatus: "PAID",
                    status: { $nin: ["Returned", "Cancelled"] }
                }
            },
            {
                $unwind: "$products"
            },
            {
                $group: {
                    _id: null,
                    totalOfferDiscount: { $sum: "$products.discount" }
                }
            },
            {
                $project: {
                    _id: 0
                }
            }
        ]);

        //Calculating total coupon discount

        let [{ totalDiscount }] = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: start, $lte: end },
                    paymentStatus: "PAID",
                    status: { $nin: ["Returned", "Cancelled"] }
                }
            },
            {
                $group: {
                    _id: null,
                    totalDiscount: { $sum: "$discountValue" }
                }
            },
            {
                $project: {
                    _id: 0
                }
            }
        ]);


        let [{ totalRefund } = { totalRefund: 0 }] = await Transactions.aggregate([
            {
                $match: {
                    method: "refund",
                    createdAt: { $gte: start, $lte: end }
                }
            },
            {
                $group: {
                    _id: null,
                    totalRefund: { $sum: "$amount" }
                }
            },
            {
                $project: {
                    _id: 0
                }
            }
        ]);



        res.status(STATUS_CODES.OK).json({
            success: true,
            message: {
                totalSalesCount,
                totalOrderAmount,
                totalRefund: totalRefund || 0,
                totalDiscount,
                totalOfferDiscount
            },
            orders: orderDetails
        });


    } catch (error) {
        console.error("Sales report fetch: ", error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Something went wrong"
        });
    }
}

const loadChart = async (req, res) => {
    try {
        const filter = req.query.filter;
        let matchFilter = {};
        let groupFilter = {};
        let sort = { sortDate: 1 };
        let labels = [];
        let values = [];
        if (filter == "weekly") {
            matchFilter = {
                createdAt: { $gte: new Date(new Date() - 7 * 24 * 60 * 60 * 1000) }
            }
            groupFilter = {
                _id: { $dayOfWeek: "$createdAt" },
                Totalamount: { $sum: "$totalAmount" },
                sortDate: { $first: "$createdAt" }
            }
        } else if (filter == "monthly") {
            matchFilter = {
                createdAt: { $gte: new Date(new Date() - 30 * 24 * 60 * 60 * 1000) }
            }

            groupFilter = {
                _id: { $dateToString: { format: "%b %d", date: "$createdAt" } },
                Totalamount: { $sum: "$totalAmount" },
                sortDate: { $first: "$createdAt" }
            }
        } else if (filter == "yearly") {
            matchFilter = {
                createdAt: { $gte: new Date(new Date() - 365 * 24 * 60 * 60 * 1000) }
            }

            groupFilter = {
                _id: { $dateToString: { format: "%b", date: "$createdAt" } },
                Totalamount: { $sum: "$totalAmount" },
                sortDate: { $first: "$createdAt" }
            }
        } else if (filter == "daily") {
            matchFilter = {
                createdAt: { $gte: new Date(new Date() - 24 * 60 * 60 * 1000) }
            }

            groupFilter = {
                _id: { $dateToString: { format: "%H:00", date: "$createdAt" } },
                Totalamount: { $sum: "$totalAmount" },
                sortDate: { $first: "$createdAt" }
            }
        }

        const arrayDetails = await Order.aggregate([
            {
                $match: matchFilter
            },
            {
                $group: groupFilter
            }, {
                $sort: sort
            }
        ]);

        for (let item of arrayDetails) {
            labels.push(item._id);
            values.push(item.Totalamount);
        }

        console.log(`labels : ${labels}\nvalues : ${values}`);
        res.status(STATUS_CODES.OK).json({
            success: true,
            labels: labels,
            values: values
        });
    } catch (error) {
        console.error("Loading chart : ", error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Something went wrong!"
        });
    }
}

const loadTopTens = async (req, res) => {
    try {
        //product rankings    
        const productRankings = await Order.aggregate([
            {
                $match: {
                    paymentStatus: "PAID",
                    status: { $nin: ["Returned", "Cancelled"] }
                }
            },
            { $unwind: "$products" },
            {
                $group: {
                    _id: "$products.product",
                    Count: { $sum: "$products.quantity" }
                }
            },
            { $sort: { Count: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: "products",
                    localField: "_id",
                    foreignField: "_id",
                    as: "details"
                }
            },
            { $unwind: "$details" },
            {
                $project: {
                    _id: 0,
                    Name: "$details.productName",
                    Count: 1
                }
            }
        ]);
        // category rankings
        const categoryRankings = await Order.aggregate([
            {
                $match: {
                    paymentStatus: "PAID",
                    status: { $nin: ["Returned", "Cancelled"] }
                }
            },
            {
                $unwind: "$products"
            },
            {
                $lookup: {
                    from: "products",
                    localField: "products.product",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },
            {
                $unwind: "$productDetails"
            },
            {
                $group: {
                    _id: "$productDetails.category",
                    Count: { $sum: "$products.quantity" },
                }
            },
            {
                $lookup: {
                    from: "categories",
                    localField: "_id",
                    foreignField: "_id",
                    as: "categoryDetails"
                }
            },
            {
                $unwind: "$categoryDetails"
            },
            {
                $sort: { Count: -1 }
            },
            {
                $limit: 10
            }, {
                $project: {
                    _id: 0,
                    Name: "$categoryDetails.name",
                    Count: 1
                }
            }
        ]);

        //brand rankings

        const brandRankings = await Order.aggregate([
            {
                $match: {
                    paymentStatus: "PAID",
                    status: { $nin: ["Returned", "Cancelled"] }
                }
            },
            {
                $unwind: "$products"
            },
            {
                $lookup: {
                    from: "products",
                    localField: "products.product",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },
            {
                $unwind: "$productDetails"
            },
            {
                $group: {
                    _id: "$productDetails.brand",
                    Count: { $sum: "$products.quantity" },
                }
            },
            {
                $lookup: {
                    from: "brands",
                    localField: "_id",
                    foreignField: "brandName",
                    as: "brandDetails"
                }
            },
            {
                $unwind: "$brandDetails"
            },
            {
                $sort: { Count: -1 }
            },
            {
                $limit: 10
            }, {
                $project: {
                    _id: 0,
                    Name: "$brandDetails.brandName",
                    Count: 1
                }
            }
        ]);

        res.status(STATUS_CODES.OK).json({
            success: true,
            products: productRankings,
            categories: categoryRankings,
            brands: brandRankings
        });

    } catch (error) {
        console.error("Top ten error : ", error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Something went wrong"
        });
    }
}

module.exports = {
    loadSalesReport,
    loadChart,
    loadTopTens
}