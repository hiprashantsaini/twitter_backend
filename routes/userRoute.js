const express = require('express');
const { check, validationResult } = require('express-validator');
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');
const auth=require('../authentication/auth');
// const session=require('express-session');

const router = express.Router();
// for signup
router.post('/signup',userController.signupUser);
// router.use(session({secret:process.env.SESSION_SECRET}));

// for loginUser with login form and update device information
router.post('/login',userController.loginUser);

//get user
router.post('/getuser',userController.getUser);

//authenticatication with token
router.post('/verifyToken',auth.authenticateWithToken);

// for device otp verification
router.post('/verify-otp',userController.verifyLoginOtp);

router.post('/google',userController.loginWithGoogle);

//send email otp
router.post('/send-emailotp',userController.sendEmailOtp);

//send phone otp
router.post('/send-phoneotp',userController.sendPhoneOtp);

router.post('/signup-verifyOtp',userController.verifyOtp);//To verify otp of email while registering

router.post('/signup-verifyPhoneOtp',userController.verifySignupPhoneOtp);//To verify otp of Phone while registering

router.post('/follow',auth.isLogin,userController.followUser);

router.post('/unfollow',auth.isLogin,userController.unFollowUser);

router.post('/transferpoints',auth.isLogin,userController.transferPoints);

//Change language
router.post('/changelanguage',auth.isLogin,userController.changeLanguage);

//Update user 
router.patch('/updateuser',userController.updateUserInfo);

//Update Cover Image 
router.patch('/updateCoverImage',userController.updateCoverImage);

//Update Cover Image 
router.patch('/updateProfileImage',userController.updateProfileImage);


module.exports = router;
