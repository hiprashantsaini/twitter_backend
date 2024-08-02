const useragent = require('useragent');
const moment = require('moment');
const User = require('../models/user');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const otpGenerator = require('otp-generator');
const findDeviceInfo = require('../utils/findDeviceInfo');
const { default: axios } = require('axios');
const accountSid = process.env.TWILLO_ACCOUNT_SID
const authToken = process.env.TWILLO_AUTH_TOKEN
const phoneNumberTwillo = process.env.TWILLO_PHONE_NUMBER
const twilio = require('twilio');
const twilioClient = new twilio(accountSid, authToken);
const otpModel = require('../models/otp');



let otps = {}; // Temporary storage for OTPs


//// send otp for device verification

const sendOtpMail = async (email, otp) => {
  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    })

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'For user verification',
      text: `Your OPT is ${otp}`
    }

    //// To wait of the calling function untill the email has been successfully sent 
    return new Promise((resolve, reject) => {
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.log(error);
          reject(error);
        } else {
          console.log('Email has been sent: ', info.response);
          resolve(true);
        }
      });
    });

  } catch (error) {
    console.log(error.message);
  }
}



const loginUser = async (req, res) => {
  try {
    const email = req.body.email;
    const password = req.body.password;
    console.log("email:", email)
    console.log("password:", password);
    let user = {};
    if (email) {
      user = await User.findOne({ email: email }).populate('subscription.planId');
      console.log("user:",user);
      if (!user) {
        //// 'status:false' means login is unsuccess and 'status:true' means login is success
        return res.status(200).send({ status: false, deviceOtp: false, message: "Invalid email or password!" });
      }
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(200).send({ status: false, deviceOtp: false, message: "Invalid email or password!" });
      }
    }

    const deviceInfo = findDeviceInfo(req);

    // //check whether the device is mobile or not
    const isMobile = deviceInfo.os.includes('Android') || deviceInfo.os === 'ios';
    
    // For time-based access controls for mobile devices
    if (isMobile) {
      const allowedLoginTimes = user.allowedLoginTimes || [];
      const currentTime = moment();

      const isAllowed = allowedLoginTimes.some(time => {
        const startTime = moment(time.startTime, 'HH:mm');
        const endTime = moment(time.endTime, 'HH:mm');
        // console.log("startTime:", startTime, time.startTime);
        // console.log("endTime:", endTime, time.endTime);
        return currentTime.isBetween(startTime, endTime);
      });

      if (!isAllowed) {
        return res.status(403).send({ status: false, deviceOtp: false, message: "Login not allowed at this time" });
      }
    }

    const existingDevice = user.devices.find((device) => {
      return (deviceInfo.browser === device.browser &&
        deviceInfo.os === device.os &&
        deviceInfo.device === device.device &&
        deviceInfo.ip === device.ip
      )
    })

    if (existingDevice) {
      existingDevice.lastAccessed = new Date();
      const updatedUser = await user.save();
      res.status(200).send({ status: true, deviceOtp: false, message: "Login successfull", user: updatedUser });
    } 
    else {
      const otp = otpGenerator.generate(6, { digits: true, lowerCaseAlphabets: false, upperCase: false, specialChars: false });
      otps[user.email] = otp;
      //give email from user.email because if user do login with phone only then we can not get email from request
      const result = await sendOtpMail(user.email, otp);
      res.status(200).send({ status: false, deviceOtp: true, message: "Otp is sent on your email for device verification." });
    }

  } catch (error) {
    console.log("login:", error.message);
    res.status(500).send({ status: false, deviceOtp: false, message: "Internal server error..." });
  }
}

//get user 
const getUser=async(req,res)=>{
   try {
      const email=req.body.email;
      const user=await User.findOne({email:email}).populate('subscription.planId');
      console.log("getUser :",user);
      return res.status(200).send({ status: true, message: "Login successfull",user:user });
   } catch (error) {
    console.log("getUser :",error.message);
    return res.status(404).send({ status: false, message: "Invalid email"});
   }
}

// verify Login otp when user login with other device. It is required to check this device is also the registered user.
const verifyLoginOtp = async (req, res) => {
  try {
    const otp = req.body.otp;
    const email = req.body.email;
    const phone = req.body.phone;
    const password = req.body.password;
    let user = {};
    if (email) {
      user = await User.findOne({ email: email }).populate('subscription.planId');
      if (!user) {
        //// 'status:false' means login is unsuccess and 'status:true' means login is success
        return res.status(200).send({ status: false, deviceOtp: false, message: "Invalid email or password!" });
      }
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(200).send({ status: false, deviceOtp: false, message: "Invalid email or password!" });
      }
    } else if (phone) {
      {
        user = await User.findOne({ phone: phone }).populate('subscription.planId');
        if (!user) {
          return res.status(200).send({ status: false, deviceOtp: false, message: "Invalid phone or password!" });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return res.status(200).send({ status: false, deviceOtp: false, message: "Invalid phone or password!" });
        }
      }
    }

    if (otp == otps[user.email]) {
      const deviceInfo = findDeviceInfo(req);
      user.devices.push({
        ...deviceInfo,
        lastAccessed: new Date(),
        otpVerified: true
      })

      const userInfo = await user.save();
      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '5h' });
      res.status(200).send({ status: true, deviceOtp: false, message: "Login successfull", token: token, user: userInfo });
      return;
    }
    return res.status(200).send({ status: false, deviceOtp: true, message: "Invalid OTP" });

  } catch (error) {
    console.log("verifyLoginOtp:", error.message);
    res.status(500).send({ status: false, deviceOtp: false, message: "Internal server error..." });
  }
}

const signupUser = async (req, res) => {
  try {
    console.log("signup user:",req.body)
    const { name, email, password } = req.body;
    const hashPassword = await bcrypt.hash(password, 10);
    const user = new User({
      name: name,
      email: email,
      password: hashPassword
    })

    const udata = await user.save();
    res.status(201).send({ message: "You are registered successfully!" });

  } catch (error) {
    console.log(error.message)
    res.status(500).send({ msg: "Internal server error.." });
  }
}


/// Login with google
const loginWithGoogle = async (req, res) => {
  try {
    const { name, email } = req.body;


    const deviceInfo = findDeviceInfo(req);

    const checkUser = await User.findOne({ email:email }).populate('subscription.planId');
    if (!checkUser) {
      const newUser = await User({
        name: name,
        email:email,
        signinWithGoogle: true,
        devices: [
          {
            ...deviceInfo,
            lastAccessed: new Date(),
            otpVerified: true
          }
        ]
      })
      const udata = await newUser.save();
      res.status(200).send({ status: true, deviceOtp: false, message: "Login successfull", user: udata });
    } else {

      const existingDevice = checkUser.devices.find((device) => {
        return (deviceInfo.browser === device.browser &&
          deviceInfo.os === device.os &&
          deviceInfo.device === device.device &&
          deviceInfo.ip === device.ip
        )
      })

      if (existingDevice) {
        existingDevice.lastAccessed = new Date();
      } else {
        checkUser.devices.push({
          ...deviceInfo,
          lastAccessed: new Date()
        })

      }

      const finalUserData = await checkUser.save();
      res.status(200).send({ status: true, deviceOtp: false, message: "Login successfull. User already exists", user: finalUserData });
    }


  } catch (error) {
    console.log("loginWithGoogle:", error.message);
    res.status(500).send({ message: "Internal server erorr" });
  }
}
//OTP verification to verify correctness of mobile and email
const verifyOtp = async (req, res) => {
  try {
    const newOtp = req.body.emailOtp;
    const email = req.body.email;
    console.log("check:", newOtp, otps)
    if (newOtp == otps[email]) {
      console.log("check:", newOtp, otps[email])
      res.status(200).send({ verified: true, message: "Otp is Valid" });
    } else {
      console.log("verifyOtp: Otp is InValid");
      res.status(400).send({ verified: false, message: "Otp is InValid" });
    }
  } catch (error) {
    console.log("sendEmailOtp:", error.message);
    res.status(500).send({ message: "Internal server error" });
  }
}

// Send email Otp 
const sendEmailOtp = async (req, res) => {
  console.log(req.body);
  try {
    const email = req.body.email;
    const otp = otpGenerator.generate(6, { digits: true, alphabets: false, upperCase: false, specialChars: false });
    otps[email] = otp;
    const data = await sendOtpMail(email, otp);
    res.status(200).send({ message: "Otp is sent on your email." });
  } catch (error) {
    console.log("sendEmailOtp:", error.message);
    res.status(500).send({ message: "Internal server error" });
  }
}

//twilioPhoneOtp

const twilioPhoneOtp = async (phone, otp) => {
  const otpPromise = new Promise((resolve, reject) => {
    twilioClient.messages.create({
      body: `Your OTP is ${otp}`,
      to: `+${phone}`, // Text your number
      from: phoneNumberTwillo, // From a valid Twilio number
    }).then((message) => {
      console.log("Phone Otp is sent");
      resolve(true)
    }).catch((error) => {
      console.log("Phone Otp error while sending");
      // console.error('Error sending OTP:', error);
      reject(error.message);
    })
  })
  return otpPromise;
}

// Send Phone Otp 
const sendPhoneOtp = async (req, res) => {
  try {
    const phoneNumber = req.body.phone;
    const cDate = new Date();
    const otp = otpGenerator.generate(6, { digits: true, lowerCaseAlphabets: false, specialChars: false, upperCaseAlphabets: false })
    console.log("Here")
    const result = await twilioPhoneOtp(phoneNumber, otp);
    console.log("result :", result)
    if (result) {
      const dataOtp = await otpModel.findOneAndUpdate(
        { phoneNumber: phoneNumber },
        { $set: { otp, otpExpiration: new Date(cDate.getTime()) } },
        { upsert: true, new: true, setDefaultOnInsert: true });
      return res.status(200).send({ status: true, message: "Mobile OTP is sent" });
    }

    console.log("sendPhoneOtp:", result);
    res.status(400).send({ status: false, message: "Enter valid Phone number or retry" });
  } catch (error) {
    console.error('Error sending OTP:', error.message);
    res.status(400).send({ status: false, message: "Something went wrong. Retry.." });
  }
}

// Verify signup phone otp
const verifySignupPhoneOtp = async (req, res) => {
  try {
    const newOtp = req.body.phoneOtp;
    const phone = req.body.phone;
    const preOtpData = await otpModel.findOne({ phoneNumber: phone });
    console.log("check:", newOtp, preOtpData)
    if (newOtp == preOtpData.otp) {
      console.log("checked:")
      res.status(200).send({ verified: true, message: "Otp is Valid" });
    } else {
      res.status(200).send({ verified: false, message: "Otp is InValid" });
    }
  } catch (error) {
    console.log("sendEmailOtp:", error.message);
    res.status(500).send({ message: "Internal server error" });
  }
}

// follow user
const followUser = async (req, res) => {
  try {
    const { userId, followedId } = req.body;
    // userId ==follower of followedId
    const followedUser = await User.findById({ _id: followedId });
    const follower = await User.findById({ _id: userId });

    if (followedUser.followers.indexOf(userId) === -1 && follower.followed.indexOf(followedId) === -1) {
      follower.followed.push(followedId);
      await follower.save();

      followedUser.followers.push(userId);
      await followedUser.save();

      await User.findByIdAndUpdate({ _id: followedId }, { $inc: { points: 10 } });

      return res.status(200).send({ status: true, message: "You have followed" });
    }

    console.log("followUser");
    return res.status(200).send({ status: true, message: "You have followed" });
    // return res.status(400).send({ status: false, message: "Already  followed" });

  } catch (error) {
    console.log("followUser:", error.message);
    res.status(500).send({ status: false, message: "Internal server error..." });
  }
}

// unfollow user 
const unFollowUser = async (req, res) => {
  try {
    const { userId, followedId } = req.body;
    // userId ==follower of followedId
    const followedUser = await User.findById({ _id: followedId });
    const followedUserIndex = followedUser.followers.indexOf(userId);
    if (followedUserIndex !== -1) {
      followedUser.followers.splice(followedUserIndex, 1);
      await followedUser.save();
    }


    const follower = await User.findById({ _id: userId });
    const followerIndex = follower.followed.indexOf(followedId);
    if (followerIndex !== -1) {
      follower.followed.splice(followerIndex, 1);
      await follower.save();
    }

    await User.findByIdAndUpdate({ _id: followedId }, { $inc: { points: -10 } });


    console.log("UnfollowUser");
    return res.status(200).send({ status: true, message: "You have unfollowed" });

  } catch (error) {
    console.log("followUser:", error.message);
    res.status(500).send({ status: false, message: "Internal server error..." });
  }
}




const transferPoints = async (req, res) => {
  try {
    const fromUserId = req.body.fromUserId;
    const toUserId = req.body.toUserId;
    const points = req.body.points;

    const transferer = await User.findById({ _id: fromUserId }, { points: 1, _id: 0 });
    console.log("Points:", points)
    console.log("transferer", transferer.points)
    if (points > transferer.points) {
      console.log("You have not sufficient points")
      return res.status(400).send({ status: false, message: "You have not sufficient points" });
    }

    await User.findByIdAndUpdate({ _id: fromUserId }, { $inc: { points: -points } });
    await User.findByIdAndUpdate({ _id: toUserId }, { $inc: { points: points } });
    console.log("Points has been transfered.")
    return res.status(200).send({ status: true, message: "Points has been transfered." });

  } catch (error) {
    console.log("transferPoints:", error.message);
    res.status(500).send({ status: false, message: "Internal server error..." });
  }
}

// Change language
const changeLanguage = async (req, res) => {
  try {
    const userId = req.body.userId;
    const language = req.body.language;
    console.log("changeLanguage:", req.body);
    await User.findByIdAndUpdate({ _id: userId }, { $set: { language: language } });
    res.status(200).send({ status: true, message: "Language is changed" });
  } catch (error) {
    console.log("changeLanguage:", error.message);
    res.status(500).send({ status: false, message: "Internal server error..." });
  }
}

//Update user information
const updateUserInfo=async(req,res)=>{
  try {
    const {userId,name,bio,location,website,dob}=req.body;
    await User.findByIdAndUpdate({_id:userId},{$set:{name:name,bio:bio,location:location,website:website,dob:dob}});
    console.log("User Information is updated successfully!");
    res.status(200).send({ status: true, message: "User Information is updated successfully!"});
  } catch (error) {
    console.log("updateUserInfo:",error.message);
    res.status(500).send({ status: false, message: "Internal server error!"});
  }
}

const updateCoverImage=async(req,res)=>{
  try {
    const {userId,converImage}=req.body;
    await User.findByIdAndUpdate({_id:userId},{$set:{coverImageUrl:converImage}});
    console.log("User cover image is updated successfully!");
    res.status(200).send({ status: true, message: "User cover image is updated successfully!"});
  } catch (error) {
    console.log("updateCoverImage:",error.message);
    res.status(500).send({ status: false, message: "Internal server error!"});
  }
}

const updateProfileImage=async(req,res)=>{
  try {
    const {userId,profileImage}=req.body;
    await User.findByIdAndUpdate({_id:userId},{$set:{profileImageUrl:profileImage}});
    console.log("User profile image is updated successfully!");
    res.status(200).send({ status: true, message: "User profile image is updated successfully!"});
  } catch (error) {
    console.log("updateProfileImage:",error.message);
    res.status(500).send({ status: false, message: "Internal server error!"});
  }
}
module.exports = {
  loginUser,
  signupUser,
  verifyLoginOtp,// When some login with new device using credentials that are used in other devices
  loginWithGoogle,
  sendEmailOtp,
  verifyOtp,
  sendPhoneOtp,
  verifySignupPhoneOtp,
  followUser,
  unFollowUser,
  transferPoints,
  changeLanguage,
  getUser,
  updateUserInfo,
  updateCoverImage,
  updateProfileImage
}