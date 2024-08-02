// models/User.js
const mongoose = require('mongoose');

const allowedTimeSchema=new mongoose.Schema({
  startTime:{type:String,required:true},
  endTime:{type:String,required:true}
})

const deviceSchema = new mongoose.Schema({
  browser: String,
  os: String,
  device: String,
  ip: String,
  lastAccessed: Date,
  otpVerified: Boolean
});

const userSchema = new mongoose.Schema({
  name:{type:String},
  email: { type: String, required: true, unique: true },
  phone:{type:String},
  password: { type: String},
  dob:{type:String},
  location:{type:String},
  bio:{type:String},
  website:{type:String},
  coverImageUrl:{type:String},
  profileImageUrl:{type:String},
  signinWithGoogle:{type:Boolean, default:false},
  followers:[{type:mongoose.Schema.Types.ObjectId,ref:'User'}],
  followed:[{type:mongoose.Schema.Types.ObjectId,ref:'User'}],
  points:{type:Number,default:0},
  //// language:{type:String,enum:['Spanish', 'Hindi', 'Portuguese', 'Tamil', 'Bengali', 'French', 'English'],default:'English'},
  language:{type:String,enum:['es', 'hi', 'pt', 'ta', 'bn', 'fr', 'en'], default:'en'},
  subscription:[{
    planId:{type:mongoose.Schema.Types.ObjectId, ref:'SubscriptionPlan',required:true},
    planName:{type:String},
    startDate:{type:Date,default:Date.now},
    endDate:{type:Date,required:true},
    isActive:{type:Boolean, default:true}
  }],
  devices: [deviceSchema],
  allowedLoginTimes:{
    type:[allowedTimeSchema],
    default:[
      {startTime:'06:00',endTime:'20:00'}//Default allowed times
    ]
  },
},{timestamps:true});

module.exports = mongoose.model('User', userSchema);
