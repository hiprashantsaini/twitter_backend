const mongoose=require('mongoose');

const postSchema=new mongoose.Schema({
    author:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},
    post:{type:String,default:''},
    media:{
        type:{type:String,enum:['text','image','video'],required:true},
        url:{type:String}
    },
    likes:[{type:mongoose.Schema.Types.ObjectId,ref:'User'}],
    comments:[{
        user:{type:mongoose.Schema.Types.ObjectId,ref:'User'},
        content:{type:String,required:true},
        createdAt:{type:Date,default:Date.now}
    }],
    shares:[{type:mongoose.Schema.Types.ObjectId,ref:'User'}],
    createdAt:{type:Date,default:Date.now}
},{timestamps:true});

module.exports=mongoose.model('Post',postSchema);