const express = require('express');
const postController = require('../controllers/postController');
const postRoute = express.Router();
const auth = require('../authentication/auth');

postRoute.post('/createpost', auth.isLogin, postController.createPost);

postRoute.get('/getposts', postController.getAllPosts);


//delete post 
postRoute.post('/deletepost', auth.isLogin, postController.deletePost);


postRoute.post('/addcomment', auth.isLogin, postController.addComment);
//delete comment
postRoute.post('/deletecomment', auth.isLogin, postController.deleteComment);
postRoute.post('/likepost', auth.isLogin, postController.likePost);

postRoute.post('/dislikepost',auth.isLogin,postController.disLikePost);
//Update title of the post
postRoute.post('/updatetitle',auth.isLogin,postController.updatePostTitle);
//Update description of the post
postRoute.post('/updatedescription',auth.isLogin,postController.updatePostDescription);


module.exports = postRoute;
