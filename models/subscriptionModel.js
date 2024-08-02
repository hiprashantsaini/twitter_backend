const mongoose=require('mongoose');

const subscriptionPlanSchema=new mongoose.Schema({
    name:{type:String,required:true, default:'free'},
    price:{type:Number,required:true, default:0},
    duration:{type:String, default:'free', enum:['monthly','yearly','free'], required:true},
    postLimit:{type:Number, default:2 ,required:true}
});



module.exports=mongoose.model('SubscriptionPlan',subscriptionPlanSchema);