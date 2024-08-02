const mongoose=require('mongoose');
const { EventTypeListInstance } = require('twilio/lib/rest/events/v1/eventType');

const otpSchema=new mongoose.Schema({
       phoneNumber:{
        type:String
       },
       email:{
        type:String
       },
       otp:{
        type:String
       }
})

const otpModel=new mongoose.model('otp',otpSchema);

module.exports=otpModel;