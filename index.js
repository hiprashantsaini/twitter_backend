const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express();
const port = process.env.PORT || 8000;


app.use(cors());
// app.use(express.urlencoded({extended:true}));
app.use(express.json());

// const uri = "mongodb+srv://twitter_project:U9hN8j94p3zkOwBc@cluster0.am7ho20.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.am7ho20.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
   

    // create collection
    const postCollection=client.db('database').collection('posts')//this is post collection
    const userCollection=client.db('database').collection('users')//this is user collection

    //get api
    app.get('/post',async(req,res)=>{
    const post=await postCollection.find().toArray();
    res.send(post);
    })

    app.get('/user',async(req,res)=>{
      const user=await userCollection.find().toArray();
      res.send(user);
      })

      app.get('/loggedInUser', async (req, res) => {
        const email = req.query.email;
        const user = await userCollection.find({ email: email }).toArray();
        res.send(user);
    })

    app.get('/userPost', async (req, res) => {
      const email = req.query.email;
      const post=await postCollection.find({email:email}).toArray();
      res.send(post);
  })

     //post api for post-> posts vala post
     app.post('/post',async(req,res)=>{
        const post=req.body;
        console.log(post)
         const result=await postCollection.insertOne(post);
         res.send(result);
         })

    app.post('/register',async(req,res)=>{
     const user=req.body;
      const result=await userCollection.insertOne(user);
      res.send(result);
      })


    app.patch('/userUpdates/:email', async (req, res) => {
      try {
          const email=req.body.email;
          const profile = req.body;
          console.log(profile,email)
          // const result=await userCollection.findOneAndUpdate({email:email},{$set:profile});
          const result = await userCollection.updateOne({email:email}, {$set:profile},{ upsert: true });
          console.log(result)
          res.send(result);
      } catch (error) {
          console.error("Error updating user:", error);
          res.status(500).send("Error updating user.");
      }
  });
  
  
  

} catch(error){
       console.log(error.message);
    }

  finally {
    // Ensures that the client will close when you finish/error
    console.log("hello")
    // await client.close(); if you close the client here then connection will be closed and connection error come for other requests
    // So no need to use this finally block. You can remove it
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Hello from Twitter Clone!')
})

app.listen(port, () => {
    console.log(`Twitter clone is listening on port ${port}`)
})


