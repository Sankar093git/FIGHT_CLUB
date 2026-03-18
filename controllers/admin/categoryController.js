import Category from '../../models/categorySchema.js';
import Product from '../../models/productSchema.js';
import STATUS_CODES from '../../utils/statusCode.js';

export const loadCategory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 4;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';

    const categoryData = await Category.find({
      name: { $regex: new RegExp(search, 'i') },
      isDeleted: false,
    })
      .sort({ _id: -1 })
      .skip(skip)
      .limit(limit);

    const totalCategories = await Category.countDocuments({
      name: { $regex: new RegExp(search, 'i') },
      isDeleted: false,
    });

    const totalPages = Math.ceil(totalCategories / limit);

    res.status(STATUS_CODES.OK).render('category', {
      cat: categoryData,
      currentPage: page,
      totalPages,
      totalCategories,
      search: search,
    });
  } catch (error) {
    console.error('Error loading categories:', error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).redirect('/admin/error');
  }
};

export const addCategory = async (req, res) => {
  try {
    const { name, description } = req.body;

    const isExists = await Category.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      isDeleted: false,
    });

    if (isExists) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        error: 'Category already exists',
      });
    }

    const formattedName = name.charAt(0).toUpperCase() + name.slice(1);

    const newCategory = new Category({
      name: formattedName,
      description,
    });

    await newCategory.save();
    const categoryDetails = await Category.findOne({ name: formattedName });

    return res.status(STATUS_CODES.CREATED).json({
      category: categoryDetails,
      message: 'Category added successfully',
    });
  } catch (error) {
    console.log(error);
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      error: 'Something went wrong, please try again',
    });
  }
};

export const addOffer = async (req, res) => {
  try {
    const percentage = parseInt(req.body.percentage);
    const categoryId = req.body.categoryId;

    if (percentage > 99 || percentage < 0 || isNaN(percentage)) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        status: false,
        message: 'Forbidden input',
      });
    }

    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        status: false,
        message: 'Category not found',
      });
    }

    await Category.updateOne(
      { _id: categoryId },
      { $set: { categoryOffer: percentage } }
    );

    const products = await Product.find({ category: categoryId });

    for (let product of products) {
      if (product.offer === 0 || product.offer < percentage) {
        let discount = product.ogSalesPrice * (percentage / 100);
        product.salesPrice = product.ogSalesPrice - discount;
        product.categoryDiscount = discount;
        await product.save();
      }
    }

    res.status(STATUS_CODES.OK).json({
      status: true,
      message: 'Offer has been added!',
    });
  } catch (error) {
    console.log('Category offer : ', error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      status: false,
      message: 'Internal Server Error',
    });
  }
};

export const removeOffer = async (req, res) => {
  try {
    const categoryId = req.body.categoryId;
    const category = await Category.findById(categoryId);

    if (!category) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        status: false,
        message: 'Category not found',
      });
    }

    await Category.updateOne(
      { _id: categoryId },
      { $set: { categoryOffer: 0 } }
    );

    const products = await Product.find({ category: categoryId });

    for (let product of products) {
      product.salesPrice = product.ogSalesPrice;
      product.categoryDiscount = 0;

      if (product.offer > 0) {
        let discount = product.ogSalesPrice * (product.offer / 100);
        product.salesPrice = product.ogSalesPrice - discount;
        product.productDiscount = discount;
      }
      await product.save();
    }

    res.status(STATUS_CODES.OK).json({
      success: true,
      message: 'Offer has been removed',
    });
  } catch (error) {
    console.error('Backend error while removing offer:', error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Internal Server Error',
    });
  }
};

export const listOrUnlist = async (req, res) => {
  try {
    let id = req.params.id;
    const category = await Category.findOne({ _id: id });

    if (category.isListed) {
      await Category.updateOne({ _id: id }, { $set: { isListed: false } });
      return res.status(STATUS_CODES.OK).json({
        success: true,
        unlisted: true,
        message: 'Category unlisted',
      });
    } else {
      await Category.updateOne({ _id: id }, { $set: { isListed: true } });
      return res.status(STATUS_CODES.OK).json({
        success: true,
        unlisted: false,
        message: 'Category listed',
      });
    }
  } catch (error) {
    console.error('Error while handling category listing', error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Something went wrong!',
    });
  }
};

export const loadEditCategory = async (req, res) => {
  try {
    const id = req.query.id;
    const category = await Category.findOne({ _id: id });
    res.status(STATUS_CODES.OK).render('edit-category', { category: category });
  } catch (error) {
    console.log('edit category error', error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).redirect('/pageerror');
  }
};

export const editCategory = async (req, res) => {
  try {
    const id = req.params.id;

    const { name, description } = req.body;
    const isExists = await Category.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      isDeleted: false,
    });

    if (isExists) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: 'Category exits please choose another name',
      });
    }

    await Category.findByIdAndUpdate(id, {
      name: name,
      description: description,
    });
    res.status(STATUS_CODES.OK).json({
      success: true,
      message: 'Category edited successfully',
    });
  } catch (error) {
    console.log(error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const id = req.params.id;
    await Category.findByIdAndUpdate(id, { isDeleted: true });
    res.status(STATUS_CODES.OK).json({
      success: true,
    });
  } catch (error) {
    console.error('Error while deleting category', error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
    });
  }
};
