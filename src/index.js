const { MongoClient } = require('mongodb');
const express = require('express');
const cors = require("cors");
require('dotenv').config();

const PORT = process.env.PORT || 8080;
const URI = process.env.URI;
const client = new MongoClient(URI, { useUnifiedTopology: true });

async function run() {
    try {
        
        await client.connect();
        
        const PMADB = client.db('PMADB');
        const users = PMADB.collection('users');
        const buildings = PMADB.collection('buildings');
        const tasks = PMADB.collection('tasks');
        const codes = PMADB.collection('buildingCodes');

        const app = express();

        const corsOptions = {
            origin: '*', 
            credentials: true,           
            optionSuccessStatus: 200,
        }
        app.use(cors(corsOptions))

        app.use((req, res, next) => {
            req.users = users;
            req.buildings = buildings;
            req.tasks = tasks;
            req.codes = codes;
            next();
        });

        app.use(express.urlencoded({extended:true}));
        app.use(express.json());
        app.use('/users', require('./api/routes/users'))
        app.use('/buildings', require('./api/routes/buildings'))
        app.use('/tasks', require('./api/routes/tasks'))

        app.listen(PORT, () => console.log(`it's alive on http://localhost:${PORT}`))

    } catch(error) {
        console.log(error.message);
    }
}

run();