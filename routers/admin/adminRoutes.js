const express = require("express");
const router = express.Router();
const adminController = require("../../controllers/admin/adminController");
const customerController = require("../../controllers/admin/customerController");
const categoryController = require("../../controllers/admin/categoryController");
const productController = require("../../controllers/admin/productController");
const brandController = require("../../controllers/admin/brandController");
const orderController = require("../../controllers/admin/orderController");
const couponController = require("../../controllers/admin/couponController");
const analyticsController = require("../../controllers/admin/analyticsController");
const constantsController = require("../../controllers/admin/constantsController");
const { adminAuth, adminAuth1 } = require("../../middlewares/auth");
const uploads = require("../../helpers/multer");
//const uploads=multer({storage:storage});


//Login management
router.get("/", adminAuth, adminController.loadDashboard);
router.get("/login", adminAuth1, adminController.loadLogin);
router.post("/login", adminAuth1, adminController.login);
router.get("/logout", adminController.logout);

//User management
router.get("/users", adminAuth, customerController.loadCustomer);
router.patch("/block-or-unblock-user", adminAuth, customerController.blockOrUnblockCustomer);

//Category management
router.get("/category", adminAuth, categoryController.loadCategory);
router.post("/add-category", adminAuth, categoryController.addCategory);
router.patch("/add-categoryOffer", adminAuth, categoryController.addOffer);
router.patch("/remove-categoryOffer", adminAuth, categoryController.removeOffer);
router.patch("/listorunlist-category/:id", adminAuth, categoryController.listOrUnlist);
router.get("/edit-category", adminAuth, categoryController.loadEditCategory);
router.post("/edit-category/:id", adminAuth, categoryController.editCategory);
router.patch("/delete-category/:id", adminAuth, categoryController.deleteCategory);

//Product management
router.get("/products", adminAuth, productController.loadProducts);
router.get("/add-product", adminAuth, productController.getAddProduct);
router.post("/add-products", adminAuth, uploads.array("images", 4), productController.addProducts);
router.get("/edit-product", adminAuth, productController.loadEditProduct);
router.patch("/edit-product/:id", adminAuth, uploads.array("images", 4), productController.editproduct);
router.patch("/delete-image/:id", adminAuth, productController.deleteImages);
router.patch("/block-or-unblock-products/:id", adminAuth, productController.blockOrUnblockproduct);

//offer management
router.patch("/product-offer", adminAuth, productController.addOffer);
router.patch("/remove-product-offer", adminAuth, productController.removeOffer);

//Brand management
router.get("/brands", adminAuth, brandController.getBrandList);
router.post("/add-brand", adminAuth, uploads.single("image"), brandController.addBrand);
router.delete("/delete-brand/:id", adminAuth, brandController.deleteBrand);
router.patch("/block-or-unblock-brand/:id", adminAuth, brandController.blockORunblockBrand);

//Coupon management
router.get("/coupon", adminAuth, couponController.loadCouponManagement);
router.post("/coupon", adminAuth, couponController.addcoupon);
router.patch("/coupon/:couponId", adminAuth, couponController.editCoupon);
router.delete("/coupon/:couponId", adminAuth, couponController.deleteCoupon);

//Order management
router.get("/orderList", adminAuth, orderController.getOrderList);
router.get("/orderDetails", adminAuth, orderController.displayOrder);
router.patch("/change-order-status/:id", adminAuth, orderController.changeOrderStatus);
router.patch("/handle-refund/:id", adminAuth, orderController.handlingReturn);
router.patch("/handle-single-return/:productId", adminAuth, orderController.handlesingleReturn);
router.patch("/update-product-status", adminAuth, orderController.handleProductStatus);

//Sales report
router.post("/generate-sales-report", adminAuth, analyticsController.loadSalesReport)
router.post("/shipping-tax", adminAuth, constantsController.addConstants);
router.get("/sales-chart", adminAuth, analyticsController.loadChart);
router.get("/top-sellers", adminAuth, analyticsController.loadTopTens);




module.exports = router;