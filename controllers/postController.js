const User = require('../models/user');
const Post = require('../models/postModel');

const checkPostLimit = async (userId) => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    const postCount = await Post.countDocuments({ author: userId, createdAt: { $gte: startOfToday, $lt: endOfToday } })
    return postCount;
}

const createPost = async (req, res) => {
    try {
        console.log("req", req.body);
        const userId = req.body.userId;
        const post = req.body?.post;
        const postType = req.body?.postType;
        const url=req.body.fileUrl;
        console.log("req.file",req.file, url)
        let planInfo = JSON.parse(req.body.planInfo);
        var planPostCount = 0;
        planInfo.forEach((plan) => {
            if (plan?.planId?.postLimit > planPostCount) {
                planPostCount = plan?.planId?.postLimit;
                console.log("plan post count", planPostCount, plan?.planId?.postLimit)
            }
        })

        
        let postCount = await checkPostLimit(userId);
     
        let create = false;
        if (planPostCount > 0 && postCount < planPostCount) {
            create = true;
        } else {
            let followers = await User.findOne({ _id: userId }, { followers: 1, _id: 0 });

            const followersCount = followers.followers.length;
     

            // for free version
            if (followersCount <= 200 && postCount < 1) {
                create = true;
            } else if (followersCount > 200 && followersCount <= 1000 && postCount < 2) {
                create = true;
            } else if (followersCount > 1000 && postCount < 5) {
                create = true;
            }
        }


        if (create) {
            const newPost = new Post({
               author: userId,
               post:post,
               media:{
                type:postType,
                url:url
               }
            })
            const postCreated = await newPost.save();
            console.log("createPost:", postCreated)
            await User.findByIdAndUpdate({ _id: userId }, { $inc: { points: 10 } });
            return res.status(200).send({ status: true, message: "Post is Created", postData: postCreated });
        }
        console.log("Your today post limit is exceeded");
        return res.status(200).send({ status: false, message: "Your today post limit is exceeded!" });
    } catch (error) {
        console.log(error.message);
        res.status(500).send({ status: false, msg: "Inernal server error" });
    }
}

// get all posts
const getAllPosts = async (req, res) => {
    try {
        const language=req.language;
        const allPosts = await Post.find({}).sort({ createdAt: -1 })  // Sort by createdAt in descending order
            .populate('author', 'name followers email points coverImageUrl profileImageUrl')
            .populate('likes', 'name')
            .populate('comments.user', 'name')
        res.status(200).send({ status: true, posts: allPosts });
    } catch (error) {
        console.log(error.message);
        res.status(500).send({ status: false, msg: "Inernal server error" });
    }
}

//delete a post
const deletePost = async (req, res) => {
    try {
        const { userId, postId } = req.body;
        await Post.findByIdAndDelete({ _id: postId });
        //decrease points by -15
        await User.findByIdAndUpdate({ _id: userId }, { $inc: { points: -15 } });
        res.status(200).send({ status: true, message: "Post has been deleted" });
    } catch (error) {
        console.log(error.message);
        res.status(500).send({ status: false, msg: "Inernal server error" });
    }
}

// Add a comment on a post
const addComment = async (req, res) => {
    try {
        const userId = req.body.userId;//User which doing comment. Not the author of Post.
        const postId = req.body.postId;
        const comment = req.body.comment;
        const post = await Post.findById({ _id: postId });
        if (post) {
            post.comments.unshift({ user: userId, content: comment });
            const data = await post.save();
            console.log("addcomment data:", data);
            await User.findByIdAndUpdate({ _id: post.author }, { $inc: { points: 2 } });
            res.status(200).send({ status: true, message: "Comment is added", post: data });
        } else {
            res.status(404).send({ status: false, message: "Post not found" });
        }

    } catch (error) {
        console.log("addComment:", error.message);
        res.status(500).send({ status: false, msg: "Inernal server error" });
    }
}

//Delete comment
const deleteComment = async (req, res) => {
    try {
        const { postId, commentId } = req.body;
        console.log(req.body);
        const post = await Post.findById({ _id: postId });
        console.log("post.comments before:", post.comments)
        if (post) {
            post.comments = post.comments.filter((item) => item._id.toString() !== commentId);
            console.log("post.comments After:", post.comments)
            await post.save();
            await User.findByIdAndUpdate({ _id: post.author }, { $inc: { points: -2 } });
            return res.status(200).send({ status: true, message: "Comment deleted!" });

        }
        res.status(404).send({ status: false, message: "Post not found" });
    } catch (error) {
        console.log("deleteComment:", error.message);
        res.status(500).send({ status: false, message: "Internal server error" });
    }
}

//Like the post

const likePost = async (req, res) => {
    console.log("like post:",req.body)
    try {
        const userId = req.body.userId;//User which doing like. Not the author of Post.
        const postId = req.body.postId;
        const post = await Post.findById({ _id: postId });
        if (post) {
            post.likes.push(userId);
            const data = await post.save();
            await User.findByIdAndUpdate({ _id: post.author }, { $inc: { points: 5 } });
            console.log("like the post:", data);
            res.status(200).send({ status: true, message: "Liked", post: data });
        } else {
            res.status(404).send({ status: false, message: "Post not found" });
        }

    } catch (error) {
        console.log("likePost:", error.message);
        res.status(500).send({ status: false, msg: "Inernal server error" });
    }
}

// Unlike the post

const disLikePost = async (req, res) => {
    try {
        const userId = req.body.userId;//User which doing dislike. Not the author of Post.
        const postId = req.body.postId;//Id of the author of Post.
        const post = await Post.findById({ _id: postId });
        const likeIndex = post.likes.indexOf(userId);
        if (likeIndex === -1) {
            return res.status(400).json({ status: true, error: 'You have not liked this video' });
        }

        post.likes.splice(likeIndex, 1);
        const data = await post.save();
        await User.findByIdAndUpdate({ _id: post.author }, { $inc: { points: -5 } });
        console.log("dislike the post:", data);
        res.status(200).json({ status: true, message: "disliked", post: data });

    } catch (error) {
        console.log("disLikePost:", error.message);
        res.status(500).json({ status: false, msg: "Inernal server error" });
    }
}

//Update post title
const updatePostTitle=async(req,res)=>{
    try {
        const postId=req.body.postId;
        const title=req.body.title;
        await Post.findByIdAndUpdate({_id:postId},{$set:{title:title}});
        return res.status(200).send({ status: true, message: "Title is updated!" });
    } catch (error) {
        console.log("updatePostTitle:", error.message);
        res.status(500).send({ status: false, message: "Internal server error" }); 
    }
}

//Update post description
const updatePostDescription=async(req,res)=>{
    try {
        const postId=req.body.postId;
        const description=req.body.description;
        await Post.findByIdAndUpdate({_id:postId},{$set:{description:description}});
        return res.status(200).send({ status: true, message: "Description is updated!" });
    } catch (error) {
        console.log("updatePostTitle:", error.message);
        res.status(500).send({ status: false, message: "Internal server error" }); 
    }
}

module.exports = {
    createPost,
    getAllPosts,
    deletePost,
    addComment,
    deleteComment,
    likePost,
    disLikePost,
    updatePostTitle,
    updatePostDescription
}