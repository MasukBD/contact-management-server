const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;

// middleware 
app.use(cors());
app.use(express.json());

const verifyJWToken = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ error: true, message: 'Unauthorized Access!' })
    }
    const token = authorization.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN, (error, decoded) => {
        if (error) {
            return res.status(401).send({ error: true, message: 'Unauthorized Access!' });
        }
        req.decoded = decoded;
        next();
    })
}


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.y1dis5d.mongodb.net/?retryWrites=true&w=majority`;

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
        client.connect();


        const contactCollection = client.db('ContactManagement').collection('contacts');
        const userCollection = client.db('ContactManagement').collection('users');
        const favoriteCollection = client.db('ContactManagement').collection('favorite');


        app.post('/jwt', (req, res) => {
            const client = req.body;
            const token = jwt.sign(client, process.env.ACCESS_TOKEN, { expiresIn: '12h' })
            res.send(token);
        })

        app.post('/users', async (req, res) => {
            const newUser = req.body;
            const query = { email: newUser.email };
            const isExistUser = await userCollection.findOne(query);
            if (isExistUser) {
                return res.status(403).send({ message: 'User Exits Already!' });
            }
            const result = await userCollection.insertOne(newUser);
            res.send(result);
        });

        app.get('/contacts', verifyJWToken, async (req, res) => {
            let query = {};
            const phone = req.query?.search;
            if (phone) {
                query = { phoneNumber: { $regex: phone, $options: 'i' } }
            }
            const cursor = contactCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        })

        app.post('/contacts', verifyJWToken, async (req, res) => {
            const user = req.body;
            const result = await contactCollection.insertOne(user);
            res.send(result);
        });

        app.put('/contacts/:id', verifyJWToken, async (req, res) => {
            const id = req.params?.id;
            const filter = { _id: new ObjectId(id) };
            const getData = req.body;
            const options = { upsert: true };
            const updatedToDB = {
                $set: {
                    name: getData.name,
                    email: getData.email,
                    phoneNumber: getData.phoneNumber,
                    address: getData.address,
                    photoURL: getData.photoURL
                }
            }
            const result = await contactCollection.updateOne(filter, updatedToDB, options);
            res.send(result);
        })

        app.delete('/contacts/:id', verifyJWToken, async (req, res) => {
            const id = req.params?.id;
            const query = { _id: new ObjectId(id) };
            const result = await contactCollection.deleteOne(query);
            res.send(result);
        });

        app.get('/favorite', verifyJWToken, async (req, res) => {
            let query = {};
            const email = req.query?.email;
            if (email) {
                query = { email: email }
            };
            const cursor = favoriteCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);

        })

        app.post('/favorite', verifyJWToken, async (req, res) => {
            const favoriteItem = req.body;
            const result = await favoriteCollection.insertOne(favoriteItem);
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
    res.send('Contact Mangement Server Is Running!');
});
app.listen(port, () => {
    console.log(`Simple Contact Management Server on port ${port}`)
})

