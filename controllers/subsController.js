const subscriptionPlan=require('../models/subscriptionModel');
const nodemailer=require('nodemailer');
const Razorpay = require("razorpay");
const User=require('../models/user');
const crypto=require("crypto");
const placeAnOrder=async(req,res)=>{
    try {
        console.log("placeAnOrder works:",req.body)
        const {planId}=req.body;
        const plan=await subscriptionPlan.findById(planId);

        if(!plan) return res.status(404).send('Plan not found');

        const instance=new Razorpay({
            key_id:process.env.RAZOR_PAY_TEST_KEY,
            key_secret:process.env.RAZOR_PAY_KEY_SECRET
        });

        const options={
          //  amount:req.body.amount*100,// amount in smallest currency unit *100 to make it in rupees
            amount:plan.price*100,
            currency:"INR",
            receipt:`receipt_order_${Date.now()}`
        };

        const order=await instance.orders.create(options);
        if(!order) return res.status(500).send("some error occured");
        console.log("Place an order:",order);
        res.json(order);

    } catch (error) {
        console.log("Place an order:",error)
        res.status(500).send(error);
    }
}

//verify payment
const verifyPayment=async(req,res)=>{
    try {
        console.log("verifyPayment works:",req.body);
        // getting the details back from our font-end
        const {orderCreationId,razorpayPaymentId,razorpayOrderId,razorpaySignature,planId,userId}=req.body;
        // Creating our own digest
        // The format should be like this:
         // digest = hmac_sha256(orderCreationId + "|" + razorpayPaymentId, secret);
         const shasum=crypto.createHmac("sha256",process.env.RAZOR_PAY_KEY_SECRET);
         shasum.update(`${orderCreationId}|${razorpayPaymentId}`);

         const digest=shasum.digest("hex");

         // comaparing our digest with the actual signature
         if(digest !== razorpaySignature){
            console.log("verifyPayment digest,razorpaySignature:",digest,req.body);
            return res.status(400).json({msg:"Transaction not legit!"});  
         }

         const plan=await subscriptionPlan.findById(planId);
         if (!plan) return res.status(404).send('Plan not found');

         const durationInMonths = plan.duration === 'monthly' ? 1 : 12;
         const endDate=new Date();
         endDate.setMonth(endDate.getMonth()+durationInMonths);

         const user=await User.findById({_id:userId})
         user.subscription.push({
            planId,
            endDate,
            isActive:true
         })

         await user.save();

         //Send invoice
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
            to: user.email,
            subject: 'For user verification',
            text:`You have successfully subscribed to '${plan.name}' plan.
               Your payment status is 'success'. Your orderId is '${razorpayOrderId}' and your payment id is '${razorpayPaymentId}'`
          }

          transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
              console.log(error);
            } else {
                console.log('Email sent: ' + info.response);;
            }
          });
        
        // THE PAYMENT IS LEGIT & VERIFIED
        // YOU CAN SAVE THE DETAILS IN YOUR DATABASE IF YOU WANT

        res.json({
            msg:"success",
            orderId:razorpayOrderId,
            paymentId:razorpayPaymentId,
        });

    } catch (error) {
        console.log("verifyPayment",error.message);
        res.status(500).send(error);
    }
}

//Get all plans
const getAllPlans=async(req,res)=>{
    try {
        const plans=await subscriptionPlan.find({});
        res.status(200).send({status:true,plans:plans});
        console.log("getAllPlans success");
    } catch (error) {
        console.log("getAllPlans:",error.message);
        res.status(404).send({message:"There is an error"});
    }
}

module.exports={
    placeAnOrder,
    verifyPayment,
    getAllPlans
}


