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
app.get("/apply", (req, res) => {
    res.render("application");
});
app.use(bodyParser.urlencoded({extended:false}));
app.post("/processApplication", async (req, res) => {
    const uri = `mongodb+srv://${username}:${password}@cluster0.yk8irim.mongodb.net/?retryWrites=true&w=majority`
    const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
    try {
        await client.connect();
        let applicant = {
            name: req.body.name,
            email: req.body.email,
            gpa: req.body.gpa,
            background: req.body.backgroundInfo
        };
        await insertApplicant(client, databaseAndCollection, applicant);
        res.render("applicationConf", applicant);
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
});
app.get("/reviewApplication", (req, res) => {
    res.render("reviewApp");
});
app.post("/processReviewApplication", async (req, res) => {
    const uri = `mongodb+srv://${username}:${password}@cluster0.yk8irim.mongodb.net/?retryWrites=true&w=majority`
    const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
    try {
        await client.connect();
        let emailID = req.body.email;
        let applicant = await lookUpEntry(client, databaseAndCollection, emailID);
        res.render("applicationConf", applicant);
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
});
app.get("/adminGPA", (req, res) => {
    res.render("adminGPA");
});
app.post("/processAdminGPA", async (req, res) => {
    const uri = `mongodb+srv://${username}:${password}@cluster0.yk8irim.mongodb.net/?retryWrites=true&w=majority`
    const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
    try {
        await client.connect();
        let gpaVal = req.body.gpa;
        let applicants = [];
        applicants = await lookUpGreaterEntries(client, databaseAndCollection, gpaVal);
        let tableStr = `<table border=1> <tr> <th>Name</th> <th>GPA</th> </tr>`;
        applicants.forEach(element => {
            tableStr += `<tr> <td>${element.name}</td> <td>${element.gpa}</td> </tr>`;
        });
        tableStr += `</table>`;
        const variables = { tableGPA: tableStr };
        res.render("adminGPAConf", variables);
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
});
app.get("/adminRemove", (req, res) => {
    res.render("adminRemove");
});
app.post("/processAdminRemove", async (req, res) => {
    const uri = `mongodb+srv://${username}:${password}@cluster0.yk8irim.mongodb.net/?retryWrites=true&w=majority`
    const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
    try {
        await client.connect();
        let count = await deleteAll(client, databaseAndCollection);
        const variables = { numRemoved: count };        
        res.render("adminRemoveConf", variables);
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
});
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

// command line interpreter
process.stdin.on('readable', () => {
	let dataInput = process.stdin.read();
	if (dataInput !== null) {
		let command = dataInput.trim();
		if (command === "stop") {
			console.log("Shutting down the server");
            process.exit(0);
        } else {
			console.log(`Invalid command: ${command}`);
		}
        process.stdout.write(prompt);
        process.stdin.resume();
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
