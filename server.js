const path = require("path");
const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const prompt = "Stop to shutdown the server: ";
require("dotenv").config({ path: path.resolve(__dirname, '.env') });
const username = process.env.MONGO_DB_USERNAME
const password = process.env.MONGO_DB_PASSWORD
const databaseAndCollection = {db: "CMSC335_DB", collection: "final335"};
const { MongoClient, ServerApiVersion, Int32 } = require('mongodb');

// argument processing
process.stdin.setEncoding("utf8");
if (process.argv.length != 3) {
    process.stdout.write(`Usage summerCampServer.js PORT_NUMBER_HERE`);
    process.exit(1);
}
const portNumber = process.argv[2];

// express
app.set("views", path.resolve(__dirname, "templates"));
app.set("view engine", "ejs");
app.get("/", (req, res) => {
    res.render("index");
});
app.use(bodyParser.urlencoded({extended:false}));

app.use((request, response) => {
    const statusCodeNotFound = 404;
    response.status(statusCodeNotFound).send("Page not found");
});
app.listen(portNumber, (err) => {
    if(err) {
        console.log("Failed to start server");
    } else {
        console.log(`Web server started and running at http://localhost:${portNumber}`);
        process.stdout.write(prompt);
    }
});

async function insertApplicant(client, databaseAndCollection, applicant) {
    const result = await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).insertOne(applicant);
    return result;
}

async function lookUpEntry(client, databaseAndCollection, emailAddr) {
    let filter = {email: emailAddr};
    const result = await client.db(databaseAndCollection.db)
                        .collection(databaseAndCollection.collection)
                        .findOne(filter);
    return result;
}

async function lookUpGreaterEntries(client, databaseAndCollection, gpaVal) {
    let filter = {gpa: { $gte: gpaVal}};
    const cursor = client.db(databaseAndCollection.db)
    .collection(databaseAndCollection.collection)
    .find(filter);
    const result = await cursor.toArray();
    return result;
}

async function deleteAll(client, databaseAndCollection) {
    const result = await client.db(databaseAndCollection.db)
                   .collection(databaseAndCollection.collection)
                   .deleteMany({});
    return result.deletedCount;
}
