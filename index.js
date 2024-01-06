const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

//middlewear
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.hlokssy.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


const verifyJWT = (req, res, next) =>{
  // console.log('hitting verify jwt funtion');
  // console.log(req.headers.authorization);
  const authorization = req.headers.authorization;
  if(!authorization){
    return res.status(401).send({error: true, message: 'unauthorized access'});
  }
  const token = authorization.split(' ')[1];
  // console.log("verify token:", token);
  jwt.verify(token, process.env.ACCESS_TOKEN, (error, decoded)=>{
    if(error){
      return res.status(403).send({error: true, message:"unauthorized access"})
    }
    req.decoded = decoded;
    next();
  })
}


async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();


    const serviceCollections = client.db('carDoctor').collection('services');
    const bookingCollections = client.db('carDoctor').collection('bookings');

    //JWT routes
    app.post('/jwt', (req, res)=>{
      const user = req.body;
      // console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: '6h' });
      res.send({token});
    })

    //Services routes
    app.get('/services', async(req, res) => {
        const cursor = serviceCollections.find();
        const result = await cursor.toArray();
        res.send(result);
    })


    app.get('/services/:id', async(req, res)=> {
      const id = req.params.id;
      const query = {_id : new ObjectId(id)};
      const result = await serviceCollections.findOne(query);
      res.send(result);
    })

    //bookings

    app.get('/bookings', verifyJWT, async(req, res) =>{
      const decoded = req.decoded
      // console.log('come back after verify', decoded);

      if(decoded.email !== req.query.email){
        res.send({error: true, message:"forbidded access"})
      }

      let query = {};
      if(req.query?.email){
        query = {email : req.query.email}
      }
      const result = await bookingCollections.find(query).toArray();
      res.send(result)
    })

    app.post('/bookings', async(req,  res)=> {
      const booking = req.body;
      const result = await bookingCollections.insertOne(booking);
      res.send(result)
    })

    app.patch('/bookings/:id', async(req, res) =>{
      const updateBooking = req.body;
      const id = req.params.id;
      const filter = {_id : new ObjectId(id)};
      const updateDoc = {
            $set: {
              status : updateBooking.status
            }
      };
      const result = await bookingCollections.updateOne(filter, updateDoc);
      res.send(result);
    })

    app.delete('/bookings/:id', async(req, res)=>{
      const id = req.params.id;
      const query = {_id : new ObjectId(id)}
      const result = await bookingCollections.deleteOne(query);
      res.send(result);
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res) =>{
    res.send('Doctor is running')
})

app.listen(port, ()=>{
    console.log(`Car server is running on port: ${port}`);
})