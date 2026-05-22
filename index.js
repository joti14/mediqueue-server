const express = require("express");
const dotenv = require("dotenv");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");
dotenv.config();
const app = express();
const port = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

const uri = process.env.MONGODB_URI;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  autoSelectFamily: false,
  serverSelectionTimeoutMS: 15000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
});

const JWKS = createRemoteJWKSet(new URL(`${process.env.CLIENT_URL}/api/auth/jwks`));

const verifyToken = async (req, res, next) => {
  const authHeader = req?.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const { payload } = await jwtVerify(token, JWKS);
    console.log(payload);
    next();
  } catch (error) {
    return res.status(403).json({ message: "Forbidden" });
  }
};

async function run() {
  try {
    await client.connect();

    const db = client.db("mediqueuedb");
    const tutorsCollection = db.collection("tutors");
    const myTutorsCollection = db.collection("myTutors");

    // app.get("/tutors", async (req, res) => {
    //   const result = await tutorsCollection.find().toArray();
    //   res.json(result);
    // });

    app.get("/tutors", async (req, res) => {
      const search = req.query.search;
      const startDate = req.query.startDate;
      const endDate = req.query.endDate;

      let query = {};

      if (search && search.trim() !== "") {
        query.$or = [
          { title: { $regex: search, $options: "i" } },
          { instructor: { $regex: search, $options: "i" } },
          { category: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
        ];
      }

      if (startDate || endDate) {
        query.sessionStartDate = {};
        if (startDate) {
          query.sessionStartDate.$gte = startDate;
        }
        if (endDate) {
          query.sessionStartDate.$lte = endDate;
        }
      }

      const result = await tutorsCollection.find(query).toArray();
      res.json(result);
    });

    app.get("/featured-tutors", async (req, res) => {
      const result = await tutorsCollection.find().limit(6).toArray();
      res.json(result);
    });

    app.get("/tutors/:id", verifyToken, async (req, res) => {
      const { id } = req.params;

      const result = await tutorsCollection.findOne({
        _id: id,
      });
      res.json(result);
    });

    app.get("/my-tutors", verifyToken, async (req, res) => {
      const result = await myTutorsCollection.find().toArray();
      res.json(result);
    });

    app.post("/my-tutors", verifyToken, async (req, res) => {
      const tutorData = req.body;
      const result = await myTutorsCollection.insertOne(tutorData);
      res.json(result);
    });

    app.patch("/my-tutors/:id", verifyToken, async (req, res) => {
      const { id } = req.params;
      const updatedData = req.body;

      const result = await myTutorsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updatedData },
      );
      res.json(result);
    });

    app.post("/my-tutors/:id", async (req, res) => {
      const { id } = req.params;
      const bookingData = req.body;

      const result = await myTutorsCollection.insertOne(bookingData);

      if (id) {
        await tutorsCollection.updateOne(
          { _id: id }, 
          { $inc: { remainingSlots: -1 } },
        );
      }

      res.json(result);
    });

    app.delete("/my-tutors/:id", verifyToken, async (req, res) => {
      const { id } = req.params;
      const result = await myTutorsCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.json(result);
    });

    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
