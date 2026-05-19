const express = require('express');
const dotenv = require('dotenv');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
dotenv.config();
const app = express();
const port = process.env.PORT || 8000;

app.use(cors());

const uri = "mongodb+srv://mediqueue:Hmf0fadzhc39IkFL@cluster0.u7ckqg9.mongodb.net/?appName=Cluster0";

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
    await client.connect();

    const db = client.db('mediqueuedb');
    const tutorsCollection = db.collection('tutors');

    app.get('/tutors', async (req, res) => {
      const result = await tutorsCollection.find().toArray();
      res.json(result);
    })

    app.get('/tutors/:id', async (req, res) => {
      const {id} = req.params;

      const result = await tutorsCollection.findOne({
        _id: new ObjectId(id),
      });
      res.json(result);
    })

    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Hello World!');
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
})
