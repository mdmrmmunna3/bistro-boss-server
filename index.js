const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.le2w9sh.mongodb.net/?retryWrites=true&w=majority`;

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

        // Get the database and collection on which to run the operation
        const usersCollection = client.db("bistroDb").collection("users");
        const menuCollection = client.db("bistroDb").collection("menu");
        const reviewCollection = client.db("bistroDb").collection("reviews");
        const cartCollection = client.db("bistroDb").collection("carts");

        // users related apis
        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email }
            const existingUser = await usersCollection.findOne(query);

            if (existingUser) {
                return res.send({ message: 'user already exits' })
            }
            const result = await usersCollection.insertOne(user);
            res.send(result);
        })

        // get menu 
        app.get('/menu', async (req, res) => {
            const result = await menuCollection.find().toArray();
            res.send(result);
        })

        // get reviews
        app.get('/reviews', async (req, res) => {
            const result = await reviewCollection.find().toArray();
            res.send(result);
        })

        // cart collections apis

        app.post('/carts', async (req, res) => {
            const item = req.body;
            // console.log(item);
            const result = await cartCollection.insertOne(item);
            res.send(result);
        })

        // app.get('/carts', async (req, res) => {
        //     const result = await cartCollection.find().toArray();
        //     res.send(result);
        // })

        app.get('/carts', async (req, res) => {
            const email = req.query.email;
            if (!email) {
                res.send([]);
            }
            const query = { email: email };
            const result = await cartCollection.find(query).toArray();
            res.send(result);
        })

        // delete cart item
        app.delete('/carts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await cartCollection.deleteOne(query);
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


app.get('/', (req, res) => {
    res.send("Bistro Boss Is Sitting");
})

app.listen(port, () => {
    console.log(`Bistro Boss is sitting on port ${port}`)
})


/**
 * -----------------------------
 *      NAMING CONVENTION
 * -----------------------------
 * 
 * users: userCollection
 * app.get('/users')
 * app.get("/users/:id")
 * app.post('/users')
 * app.patch('/users/:id')
 * app.put('/users/:id')
 * app.delete("/users/:id")
 */