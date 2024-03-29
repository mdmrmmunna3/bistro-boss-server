const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY);
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

// middlewares
const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ error: true, message: 'unauthorized access' });
    }
    // bearer token form client side
    const token = authorization.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ error: true, message: 'unauthorized access' });
        }
        req.decoded = decoded;
        next();
    })
}

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
        const paymentCollection = client.db("bistroDb").collection("payments");
        const bookingCollection = client.db("bistroDb").collection("bookings");
        const contactCollection = client.db("bistroDb").collection("contacts");

        // jwt related api
        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            res.send({ token });
        })

        // middleware
        // Warning: use verifyJWT before using verifyAdmin
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email }
            const user = await usersCollection.findOne(query);
            if (user?.role !== 'admin') {
                return res.status(403).send({ error: true, message: 'forbidden message' })
            }
            next();
        }

        /**
         * 1. do not show secure links to those who should not see the links
         * 2. use jwt token : verifyJWT
         * 3. use verifyAdmin middelware
         */

        // users related apis
        app.get('/users', verifyJWT, verifyAdmin, async (req, res) => {
            const result = await usersCollection.find().toArray();
            res.send(result);
        })

        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email }
            const existingUser = await usersCollection.findOne(query);

            if (existingUser) {
                return res.send({ message: 'user already exits' })
            }
            const result = await usersCollection.insertOne(user);
            res.send(result);
        });

        // verify security: verifyJWT
        // email same 
        // check admin
        app.get('/users/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const query = { email: email }
            if (req.decoded?.email !== email) {
                res.send({ admin: false })
            }
            const user = await usersCollection.findOne(query);
            const result = { admin: user?.role === 'admin' }
            res.send(result);
        })

        // upadte method 
        // put: transmits whole resources data 
        // patch: transmits partial data

        app.patch('/users/admin/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    role: "admin"
                },
            };
            const result = await usersCollection.updateOne(filter, updateDoc);
            res.send(result);
        })

        // users delete apis
        app.delete('/users/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await usersCollection.deleteOne(query);
            res.send(result);
        })

        // get menu 
        app.get('/menu', async (req, res) => {
            const result = await menuCollection.find().toArray();
            res.send(result);
        });

        // post new menu item
        app.post('/menu', verifyJWT, verifyAdmin, async (req, res) => {
            const newItem = req.body;
            const result = await menuCollection.insertOne(newItem)
            res.send(result);
        })

        // get an item
        app.get('/menu/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await menuCollection.findOne(query);
            res.send(result);
        })

        // update menu item api
        app.patch('/menu/:id', async (req, res) => {
            const item = req.body;
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    name: item.name,
                    category: item.category,
                    price: item.price,
                    recipe: item.recipe,
                    image: item.image
                }
            }

            const result = await menuCollection.updateOne(filter, updatedDoc)
            res.send(result);
        })

        // deleted a menu item 
        app.delete('/menu/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await menuCollection.deleteOne(query);
            res.send(result);
        })


        // get reviews
        app.get('/reviews', async (req, res) => {
            const result = await reviewCollection.find().sort({ _id: -1 }).toArray();
            res.send(result);
        })

        // post reviews related api
        app.post('/reviews', verifyJWT, async (req, res) => {
            const review = req.body;
            const result = await reviewCollection.insertOne(review);
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

        // app.get('/carts', verifyJWT, async (req, res) 
        app.get('/carts', verifyJWT, async (req, res) => {
            const email = req.query.email;
            if (!email) {
                res.send([]);
            }

            const decodedEmail = req.decoded?.email;
            if (decodedEmail !== email) {
                return res.status(403).send({ error: true, message: 'forbidden access' });
            }

            const query = { email: email };
            const result = await cartCollection.find(query).toArray();
            res.send(result);
        })

        // delete cart item
        app.delete('/carts/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await cartCollection.deleteOne(query);
            res.send(result);
        })

        // create payment intent api
        app.post('/create-payment-intent', verifyJWT, async (req, res) => {
            const { price } = req.body;
            const amount = parseInt(price * 100);
            // console.log(amount, 'amount inside the intent')

            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });

            res.send({
                clientSecret: paymentIntent.client_secret
            })
        });

        // payment related api
        app.post('/payments', verifyJWT, async (req, res) => {
            const payment = req.body;
            const insertedResult = await paymentCollection.insertOne(payment);

            const query = { _id: { $in: payment.cartsItemsId.map(id => new ObjectId(id)) } }
            const deletedResult = await cartCollection.deleteMany(query);

            res.send({ insertedResult, deletedResult });
        })


        // get payment histroy api 
        app.get('/payments/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            if (req.decoded?.email !== email) {
                return res.status(403).send({ error: true, message: 'forbidden access' });
            }
            const result = await paymentCollection.find(query).toArray();

            const formatedDateAndDayName = (dateString) => {
                const date = new Date(dateString);
                const formatedDate = date.toLocaleString('en-US', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    timeZone: 'UTC',
                    weekday: 'long'
                });
                // const dayName = date.toLocaleString('en-US', { weekday: 'long' });
                // console.log(formatedDate, dayName)
                return { formatedDate };
            }
            // Extract and log date and day name for each entry
            result.forEach((entry) => {
                const { formatedDate } = formatedDateAndDayName(entry?.date);
                // console.log(`formattedDate: ${formatedDate}, dayName: ${dayName}`);
                entry.date = formatedDate;
            })
            res.send(result);

        })


        // admin stats (admin home) related api
        app.get('/admin-stats', verifyJWT, verifyAdmin, async (req, res) => {

            const users = await usersCollection.estimatedDocumentCount();
            const products = await menuCollection.estimatedDocumentCount();
            const orders = await paymentCollection.estimatedDocumentCount();

            // best way to get sum of the feild is to use group and sum operator
            /**
             * this is a mongodb query / aggergate grouping operation
             * await paymentCollection.aggregate([
                {
                  $group: {
                    _id: null,
                    totalAmount: { $sum: '$price' }
                  }
                }
              ]).toArray();
             */

            //   easy way 
            const payments = await paymentCollection.find().toArray();
            const getRevenue = payments.reduce((sum, payment) => sum + payment.price, 0)
            const revenue = getRevenue.toFixed(2);
            // console.log(revenue)
            res.send({
                revenue,
                users,
                products,
                orders
            })
        })



        /**
         * -------------------
         * BANGLA SYSTEM(second best solution)
         * -----------------------------------------
         * 1. load all payments
         * 2. for each payment , get the menuItems array
         * 3. for each item int he menuItems array get the menuItem from the menuCollection
         * 4. put item in an array : allOrderItems
         * 5. separate allOrderItems category by using filter
         * 6. now get the quantity by using length: like: salad.length
         * 7. for each category use reduce to get the total amount spent on this category
         */

        app.get('/order-stats', verifyJWT, verifyAdmin, async (req, res) => {
            const menuItemsStats = await paymentCollection.aggregate([
                { $unwind: '$menuItemsId' },
                {
                    $lookup: {
                        from: 'menu',
                        localField: 'menuItemsId',
                        foreignField: '_id',
                        as: 'menuItemData'
                    }
                },
                {
                    $unwind: '$menuItemData'
                },
                {
                    $group:
                    {
                        _id: '$menuItemData.category',
                        itemsCount: { $sum: 1 },
                        totalPrice: { $sum: '$menuItemData.price' }
                    }
                },
                {
                    $project:
                    {
                        category: '$_id',
                        itemsCount: 1,
                        totalPrice: { $round: ['$totalPrice', 2] },
                        _id: 0
                    }
                }, // Round to 2 decimal places
            ]).toArray();

            res.send(menuItemsStats);

        })

        // user stats (user home) related api
        app.get('/user-stats', verifyJWT, async (req, res) => {
            const decodedEmail = req.decoded?.email;
            // console.log(decodedEmail)

            const menu = await menuCollection.estimatedDocumentCount();
            const carts = await cartCollection.find().toArray();
            const reviews = await reviewCollection.find().toArray();
            const bookings = await bookingCollection.find().toArray();
            const payments = await paymentCollection.find().toArray();
            const contacts = await contactCollection.find().toArray();


            const cart = carts.filter(shop => shop?.email === decodedEmail);
            const getReviews = reviews.filter(review => review?.email === decodedEmail);
            const getBookings = bookings.filter(booking => booking?.email === decodedEmail);
            const getPayments = payments.filter(payment => payment?.email === decodedEmail);
            const getContacts = contacts.filter(contact => contact?.email === decodedEmail);
            res.send({
                menu,
                cart,
                getReviews,
                getBookings,
                getPayments,
                getContacts
            })
        })

        // booking a table related api
        app.post('/bookings', verifyJWT, async (req, res) => {
            const booking = req.body;
            const result = await bookingCollection.insertOne(booking);
            res.send(result);
        });

        app.get('/bookings', verifyJWT, verifyAdmin, async (req, res) => {
            const result = await bookingCollection.find().toArray();
            result.map((entry) => {
                const bookingTimeDate = entry.bookingTime;
                const [hours, minutes] = bookingTimeDate.split(':');
                const dummyDate = new Date(0, 0, 0, hours, minutes);
                const twelveHourTime = dummyDate.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: 'numeric',
                    hour12: true
                })
                entry.bookingTime = twelveHourTime;
                return { twelveHourTime };
            })
            res.send(result);
        });

        // get bookings
        app.get('/bookings/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const result = await bookingCollection.find(query).toArray();

            result.map((entry) => {
                const bookingTimeDate = entry.bookingTime;
                const [hours, minutes] = bookingTimeDate.split(':');
                const dummyDate = new Date(0, 0, 0, hours, minutes);
                const twelveHourTime = dummyDate.toLocaleTimeString('en-US',
                    {
                        hour: 'numeric',
                        minute: 'numeric',
                        hour12: true
                    });
                entry.bookingTime = twelveHourTime
                return { twelveHourTime }
            })

            res.send(result);
        })

        // delete booking api
        app.delete('/bookings/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await bookingCollection.deleteOne(query);
            res.send(result)
        })

        // contact us related api
        app.post('/contactUs', verifyJWT, async (req, res) => {
            const contact = req.body;
            const result = await contactCollection.insertOne(contact);
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