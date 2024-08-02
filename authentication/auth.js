const User=require('../models/user');
const jwt=require('jsonwebtoken');
const isLogin=async(req,res,next)=>{
    try {
        const userId= req.body.userId;
        console.log("data in isLogin:",req.body);
        console.log("userId",userId)
        const userData=await User.findById({_id:userId});
        if(userData){
            req.userId=userData._id;
            req.language=userData?.language;
            next();
        }else{
            return res.status(401).send({status:false,message:"Unauthorized error"});
        }
    } catch (error) {
        return res.status(400).send({status:false,message:"Authentication error"});
    }
}


const isSubscriptionActive=async(user)=>{
const currentDate=new Date();
    
   user.subscription.forEach((subscription)=>{
     const endDate=new Date(subscription.endDate);
     console.log("currentdate:",currentDate);
     console.log("lastdate:",endDate);
     subscription.isActive= currentDate<=endDate;
   });
    // Save the updated user document back to the database
    await user.save();
// Return the updated subscriptions
  return user.subscription;

}


const authenticateWithToken=async(req,res,next)=>{
    try{
    let token=req.body?.token;
    console.log(token);

    if(!token){
        return res.status(400).send({ status: false, message: "Token is unavailable"});
    }
    const payload=jwt.verify(token,process.env.JWT_SECRET);
    console.log("payload",payload);
    const userId=payload.userId;
    console.log("userId inside",userId)
    const user=await User.findById({_id:userId}).populate('subscription.planId');
    if(user){
        req.userId=user._id;
        //Check subscription plan and update its isActive status.
        await isSubscriptionActive(user);
        return res.status(200).send({ status: true, deviceOtp: false, message: "Login successfull",user:user });
        
    }else{
        return res.status(404).send({ status: false, message: "Invalid token"});
    }
} catch (error) {
    console.log('authenticateWithToken:',error.message);
    return res.status(404).send({ status: false, message: "Invalid token"});
}
}

module.exports={
    isLogin,
    authenticateWithToken
};