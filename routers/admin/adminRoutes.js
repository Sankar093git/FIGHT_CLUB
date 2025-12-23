const express=require("express");
const router=express.Router();
const adminController=require("../../controllers/admin/adminController");
const customerController=require("../../controllers/admin/customerController");
const categoryController=require("../../controllers/admin/categoryController");
const productController=require("../../controllers/admin/productController");
const brandController=require("../../controllers/admin/brandController");
const orderController=require("../../controllers/admin/orderController");
const {adminAuth,adminAuth1}=require("../../middlewares/auth");
const multer=require("multer");
const uploads=require("../../helpers/multer");
//const uploads=multer({storage:storage});


//Login management
router.get("/",adminAuth,adminController.loadDashboard);
router.get("/login",adminAuth1,adminController.loadLogin);
router.post("/login",adminAuth1,adminController.login);
router.get("/logout",adminController.logout);

//User management
router.get("/users",adminAuth,customerController.loadCustomer);
router.get("/block-or-unblock-user",adminAuth,customerController.blockOrUnblockCustomer);

//Category management
router.get("/category",adminAuth,categoryController.loadCategory);
router.post("/add-category",adminAuth,categoryController.addCategory);
router.post("/add-categoryOffer",adminAuth,categoryController.addOffer);
router.patch("/remove-categoryOffer",adminAuth,categoryController.removeOffer);
router.get("/listorunlist-category",adminAuth,categoryController.listOrUnlist);
router.get("/edit-category",adminAuth,categoryController.loadEditCategory);
router.post("/edit-category/:id",adminAuth,categoryController.editCategory);
router.get("/delete-category/:id",adminAuth,categoryController.deleteCategory);

//Product management
router.get("/products",adminAuth,productController.loadProducts);
router.get("/add-product",adminAuth,productController.getAddProduct);
router.post("/add-products",adminAuth,uploads.array("images",4),productController.addProducts);
router.get("/edit-product",adminAuth,productController.loadEditProduct);
router.post("/edit-product/:id",adminAuth,uploads.array("images",4),productController.editproduct);
router.post("/delete-image/:id",adminAuth,productController.deleteImages);
router.post("/block-or-unblock-products/:id",adminAuth,productController.blockOrUnblockproduct);
//Brand management
router.get("/brands",adminAuth,brandController.getBrandList);
router.post("/add-brand",adminAuth,uploads.single("image"),brandController.addBrand);
router.delete("/delete-brand/:id",adminAuth,brandController.deleteBrand)
router.patch("/block-or-unblock-brand/:id",adminAuth,brandController.blockORunblockBrand)


//Order management
router.get("/orderList",adminAuth,orderController.getOrderList);
router.get("/orderDetails",adminAuth,orderController.displayOrder);
router.post("/change-order-status/:id",adminAuth,orderController.changeOrderStatus);
router.post("/handle-refund/:id",adminAuth,orderController.handlingReturn);
router.patch("/handle-single-return/:productId",adminAuth,orderController.handlesingleReturn);



module.exports=router;