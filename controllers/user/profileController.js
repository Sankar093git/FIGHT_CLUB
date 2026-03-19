import User from '../../models/userSchema.js';
import {
  sendVerificationMail,
  generateOTP,
  securePassword,
} from '../../controllers/user/userController1.js';
import Orders from '../../models/orderSchema.js';
import Wallet from '../../models/walletShema.js';
import Transaction from '../../models/transactionSchema.js';
import STATUS_CODES from '../../utils/statusCode.js';

export const loadProfile = async (req, res) => {
  try {
    const orderPage = parseInt(req.query.orderPage) || 1;
    const orderLimit = 5;
    const skip = (orderPage - 1) * orderLimit;
    const id = req.session.user;
    const findUser = await User.findOne({ _id: id, isBlocked: false }).populate(
      'wishlist.product'
    );
    const addressDetails = findUser.address;
    const addPage = parseInt(req.query.addPage) || 1;
    const addLimit = 4;
    const addskip = (addPage - 1) * addLimit;
    let address = addressDetails.slice(addskip, addskip + addLimit);
    const orderDetails = await Orders.find({ user: id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(orderLimit);
    const totalOrders = await Orders.countDocuments({ user: id });
    const paidOrders = await Orders.countDocuments({
      user: id,
      paymentStatus: 'PAID',
    });
    const refereby = await User.findOne({ _id: id });
    let referee = refereby.referedBy || null;
    let newbee;
    if (paidOrders == 0 && referee == null) {
      newbee = true;
    }
    const wishPage = parseInt(req.query.wpage) || 1;
    const wishlistDetails = findUser.wishlist;
    const wishLimit = 3;
    const wishSkip = (wishPage - 1) * wishLimit;
    const wishlist = wishlistDetails.slice(wishSkip, wishSkip + wishLimit);

    const totalOrderPages = Math.ceil(totalOrders / orderLimit);
    const image = findUser.userImage;
    const username = findUser.name;
    const walletDetails = await Wallet.findOne({ userId: req.session.user });
    const tpage = req.query.tpage || 1;
    const transactionLimit = 5;
    const transSkip = (tpage - 1) * transactionLimit;
    const transactions = await Transaction.find({ userId: req.session.user })
      .sort({ createdAt: -1 })
      .skip(transSkip)
      .limit(transactionLimit);
    const totalTrancastions = await Transaction.countDocuments({
      userId: req.session.user,
    });
    const totalTpages = Math.ceil(totalTrancastions / transactionLimit);

    res.status(STATUS_CODES.OK).render('profile', {
      userData: findUser,
      wishlist,
      totalWpages: Math.ceil(wishlistDetails.length / wishLimit),
      currentWpage: wishPage,
      address: address,
      user: req.session.userName || username,
      image: image,
      orders: orderDetails,
      totalOrderPages: totalOrderPages,
      totalAddPages: Math.ceil(addressDetails.length / addLimit),
      currentOrderPage: orderPage,
      currentAddPage: addPage,
      wallet: walletDetails,
      transactions: transactions,
      totalTpages: totalTpages,
      currentTpage: tpage,
      newbee,
    });
  } catch (error) {
    console.log('Error while loading profilepage', error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).redirect('/error');
  }
};

export const addAddress = async (req, res) => {
  try {
    await User.updateOne(
      { _id: req.session.user },
      { $addToSet: { address: req.body } }
    );
    res.status(STATUS_CODES.OK).redirect('/profile');
  } catch (error) {
    console.error('Error while adding address', error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).redirect('/error');
  }
};

export const editAddress = async (req, res) => {
  try {
    const addressId = req.params.id;
    const {
      label,
      street,
      city,
      state,
      country,
      postalCode,
      phone,
      isDefault,
    } = req.body;

    await User.updateOne(
      { _id: req.session.user, 'address._id': addressId },
      {
        $set: {
          'address.$.label': label,
          'address.$.street': street,
          'address.$.city': city,
          'address.$.state': state,
          'address.$.country': country,
          'address.$.postalCode': postalCode,
          'address.$.phone': phone,
          'address.$.isDefault': isDefault,
        },
      }
    );

    res.status(STATUS_CODES.OK).redirect('/profile');
  } catch (error) {
    console.error('Addess edit error,', error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).redirect('/error');
  }
};

export const deleteAddress = async (req, res) => {
  try {
    const id = req.params.id;
    await User.updateOne(
      { _id: req.session.user },
      { $pull: { address: { _id: id } } }
    );
    res.status(STATUS_CODES.OK).redirect('/profile');
  } catch (error) {
    console.error('Error while deleting address', error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).redirect('/error');
  }
};

export const loadEditProfile = async (req, res) => {
  try {
    const userData = await User.findOne({ _id: req.session.user });
    res.status(STATUS_CODES.OK).render('edit-profile', {
      userData: userData,
    });
  } catch (error) {
    console.error('Error while loading edit profile page', error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).redirect('/error');
  }
};

export const changeProfilePicture = async (req, res) => {
  try {
    const id = req.params.id;
    const image = req.file.filename;
    const testText = image.split('').reverse().join('');
    console.log(testText);
    let arr = testText.split('.');
    const ext = arr[0];
    if (!['gpj', 'gnp'].includes(ext)) {
      return res
        .status(STATUS_CODES.BAD_REQUEST)
        .json({ success: false, message: 'Please enter a valid image' });
    }
    await User.updateOne({ _id: id }, { $set: { userImage: image } });
    res.status(STATUS_CODES.OK).json({
      success: true,
      image: '/uploads/profiles/' + image,
    });
  } catch (error) {
    console.error('Error while changing the profile picture', error);
    res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json({ message: 'Somthing went wrong' });
  }
};

export const editProfile = async (req, res) => {
  try {
    const { email, phone, password } = req.body;
    req.session.email = email;
    req.session.phone = phone;
    req.session.password = password;
    const otp = await generateOTP();
    console.log('The otp is: ', otp);
    const sendMail = await sendVerificationMail(otp, null, req.session.email);
    req.session.otp = otp;
    req.session.otpExpiresAt = Date.now() + 60 * 1000;
    if (sendMail) {
      res.status(STATUS_CODES.OK).json({ result: true });
    } else {
      res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ result: false });
    }
  } catch (error) {
    console.log('Error while editing the user profile', error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).redirect('/error');
  }
};

export const loadVerifyOtp = async (req, res) => {
  try {
    res.status(STATUS_CODES.OK).render('verify-otp-editProfile');
  } catch (error) {
    console.error('Error while loading otp page', error);
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    console.log(req.session.otp);
    if (!req.session.otp) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: 'Session expired. Please try again.',
      });
    }

    if (Date.now() > req.session.otpExpiresAt) {
      delete req.session.otp;
      delete req.session.otpExpiresAt;
      return res
        .status(STATUS_CODES.BAD_REQUEST)
        .json({
          success: false,
          message: 'DO NOT REFRESH!. OTP has expired. Please wait and request a new one.',
        });
    }

    if (otp == req.session.otp) {
      const newEmail = req.session.email;
      delete req.session.email;
      const newPhone = req.session.phone;
      delete req.session.phone;
      const newPass = req.session.password;
      delete req.session.password;
      const userData = await User.findOne({ _id: req.session.user });

      if (userData.email == newEmail && newPass) {
        const newPassword = await securePassword(newPass);
        await User.updateOne(
          { _id: req.session.user },
          { $set: { phone: newPhone, password: newPassword } }
        );
        return res
          .status(STATUS_CODES.OK)
          .json({ success: true, message: 'OTP verified successfully' });
      } else {
        await User.updateOne(
          { _id: req.session.user },
          { $set: { email: newEmail, phone: newPhone } }
        );
        return res
          .status(STATUS_CODES.OK)
          .json({ success: true, message: 'Email Id changed succesfully' });
      }
    } else {
      res
        .status(STATUS_CODES.BAD_REQUEST)
        .json({ success: false, message: 'Invalid OTP!' });
    }
  } catch (error) {
    console.error('Error occured while verifying otp', error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).redirect('/error');
  }
};
