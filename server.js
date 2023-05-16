const path = require("path");
const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const NLPCloudClient = require('nlpcloud');
const axios = require('axios');
const qs = require('qs');

require("dotenv").config({ path: path.resolve(__dirname, '.env') });
const username = process.env.MONGO_DB_USERNAME
const password = process.env.MONGO_DB_PASSWORD
const databaseAndCollection = {db: "CMSC335_DB", collection: "final335"};
const { MongoClient, ServerApiVersion, Int32 } = require('mongodb');
const portNumber = 3000;

// const client = new NLPCloudClient('fast-gpt-j','30676e161f5b57f8e001deaab18d3db69c0701cd');

// express
app.set("views", path.resolve(__dirname, "templates"));
app.set("view engine", "ejs");
app.get("/", (req, res) => {
    res.render("index");
});
app.use(bodyParser.urlencoded({extended:false}));

// app.get("/planTrip", (req, res) => { 
//     res.sendFile( __dirname + '/planTrip.html');
// });

// app.post("/planTrip", async (req, res) => {
//     const options = {
//         method: 'GET',
//         url: 'https://ai-trip-planner.p.rapidapi.com/',
//         params: {
//           days: req.body.days,
//           destination: req.body.destination
//         },
//         headers: {
//           'X-RapidAPI-Key': 'd42dbf8407mshd9237b84370de00p174b08jsndf9a6e1810c2',
//           'X-RapidAPI-Host': 'ai-trip-planner.p.rapidapi.com'
//         }
//       };
      
//       try {
//           const response = await axios.request(options);
//           console.log(response.data);
//           res.send(response.data);
//       } catch (error) {
//           console.error(error);
//       }
// });

app.get("/recommendations", (req, res) => { 
    res.sendFile( __dirname + '/recommendations.html');
});

app.post("/recommendations", async (req, res)  =>  { 
    const token = await getToken();

    try {
        const limit = 5;
        let q = `artist%3A${req.body.artist}`; // %3A is a colon
        let type = "artist";
        const artist1 = await axios.get(`https://api.spotify.com/v1/search?q=${q}&type=${type}`, 
        {
            headers: { 
                Authorization: `Bearer ${token}` 
            },
        });

        id_artist = artist1.data.artists.items[0].id 

        q = `track%3A${req.body.track}+artist%3A${req.body.songArtist}`
        type = "track"
        const track1 = await axios.get(`https://api.spotify.com/v1/search?q=${q}&type=${type}`, 
        {
            headers: { 
                Authorization: `Bearer ${token}` 
            },
        });

        id_track = track1.data.tracks.items[0].id;
        
        const recommendations = await axios.get(`https://api.spotify.com/v1/recommendations?seed_artists=${id_artist}&seed_genres=${req.body.genre}&seed_tracks=${id_track}&limit=${limit}`, 
        {
            headers: { 
                Authorization: `Bearer ${token}` 
            },
        });

        recs = new Array(limit);
        let rec = null;
        for (let i = 0; i < limit; i++ ){ 
            rec = recommendations.data.tracks[i];
            recs[i] = `${rec.type}: ${rec.name}`;
        }

        variables = { 
            rec1: recs[0], 
            rec2: recs[1],
            rec3: recs[2],
            rec4: recs[3],
            rec5: recs[4]
        }
        res.render("recommendations", variables);
        // recommendations.data.tracks.forEach(rec => console.log(`${rec.type}: ${rec.name}`));
    }
    catch(error) {
        console.log(error);
    }
});

async function getToken() {
    try {
        const data = qs.stringify({'grant_type':'client_credentials'});

        const response = await axios.post('https://accounts.spotify.com/api/token', 
        data, {
        headers: { 
            'Content-Type': 'application/x-www-form-urlencoded' 
        },
        auth: {
            username: process.env.client_id,
            password: process.env.client_secret
          }
        });
        return response.data.access_token; 
    } catch(error) {
        console.log(error);
    }
}

app.use((request, response) => {
    const statusCodeNotFound = 404;
    response.status(statusCodeNotFound).send("Page not found");
});

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
