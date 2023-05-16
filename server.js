const path = require("path");
const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const NLPCloudClient = require('nlpcloud');
const axios = require('axios');

require("dotenv").config({ path: path.resolve(__dirname, '.env') });
const username = process.env.MONGO_DB_USERNAME
const password = process.env.MONGO_DB_PASSWORD
const databaseAndCollection = {db: "CMSC335_DB", collection: "final335"};
const { MongoClient, ServerApiVersion, Int32 } = require('mongodb');
const portNumber = 3000;

const client = new NLPCloudClient('fast-gpt-j','30676e161f5b57f8e001deaab18d3db69c0701cd');

// express
app.set("views", path.resolve(__dirname, "templates"));
app.set("view engine", "ejs");
app.get("/", (req, res) => {
    res.render("index");
});
app.use(bodyParser.urlencoded({extended:false}));

app.get("/ask", async (req, res) => {
    const options = {
        method: 'GET',
        url: 'https://ai-trip-planner.p.rapidapi.com/',
        params: {
          days: '3',
          destination: 'London,UK'
        },
        headers: {
          'X-RapidAPI-Key': 'd42dbf8407mshd9237b84370de00p174b08jsndf9a6e1810c2',
          'X-RapidAPI-Host': 'ai-trip-planner.p.rapidapi.com'
        }
      };
      
      try {
          const response = await axios.request(options);
          console.log(response.data);
          res.send(response.data);
      } catch (error) {
          console.error(error);
      }
});

// app.use((request, response) => {
//     const statusCodeNotFound = 404;
//     response.status(statusCodeNotFound).send("Page not found");
// });

app.listen(portNumber, (err) => {
    if(err) {
        console.log("Failed to start server");
    } else {
        console.log(`Web server started at port 3000`);
    }
});

async function insertTripDetails(client, databaseAndCollection, trip) {
    const result = await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).insertOne(trip);
    return result;
}

async function lookUpEntry(client, databaseAndCollection, emailAddr) {
    let filter = {email: emailAddr};
    const result = await client.db(databaseAndCollection.db)
                        .collection(databaseAndCollection.collection)
                        .findOne(filter);
    return result;
}

async function deleteAll(client, databaseAndCollection) {
    const result = await client.db(databaseAndCollection.db)
                   .collection(databaseAndCollection.collection)
                   .deleteMany({});
    return result.deletedCount;
}
