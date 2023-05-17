const path = require("path");
const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const axios = require('axios');

require("dotenv").config({ path: path.resolve(__dirname, '.env') });
const username = process.env.MONGO_DB_USERNAME
const password = process.env.MONGO_DB_PASSWORD
const databaseAndCollection = {db: "CMSC335_DB", collection: "final335"};
const { MongoClient, ServerApiVersion, Int32 } = require('mongodb');
const portNumber = 3000;
const uri = `mongodb+srv://${username}:${password}@cluster0.yk8irim.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

// express
app.set("views", path.resolve(__dirname, "templates"));
app.set("view engine", "ejs");
app.get("/", (req, res) => {
    res.render("index");
});
app.use(bodyParser.urlencoded({extended:false}));
app.use(express.static(__dirname + '/assets'));

app.get("/playlists", async (req, res) => {
    try {
        await client.connect();
        const playlists = await queryPlaylists(client, databaseAndCollection);
        res.render("playlists", { playlists });
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    } 
});

app.post("/playlists", async (req ,res) => {
    try {
        await client.connect();
        await deletePlaylists(client, databaseAndCollection);
        res.render("playlists", { playlists: [] });
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
});

app.get("/playlist", async(req, res) => {
    try {
        await client.connect();
        const playlist = await queryPlaylist(client, databaseAndCollection, req.query.name);
        res.render("playlist", { playlist });
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
});

app.get("/recommendations", (req, res) => { 
    res.render("recommendSongs");
});

app.post("/recommendations", async (req, res)  =>  { 
    const token = await getToken();

    try {
        // const limit = 5;
        let limit = req.body.limit;
        let q = `artist:${req.body.artist}`; 
        let type = "artist";
        const artist1 = await axios.get(`https://api.spotify.com/v1/search?q=${q}&type=${type}`, 
        {
            headers: { 
                Authorization: `Bearer ${token}` 
            },
        });

        if (artist1.data.artists.items.length == 0) {
            res.render("invalid", {field: "artist"});
            return;
        }
        let id_artist = artist1.data.artists.items[0].id

        q = `track:${req.body.track}+artist:${req.body.songArtist}`
        type = "track"
        const track1 = await axios.get(`https://api.spotify.com/v1/search?q=${q}&type=${type}`, 
        {
            headers: { 
                Authorization: `Bearer ${token}` 
            },
        });

        if (track1.data.tracks.items.length == 0) {
            res.render("invalid", {field: "track"});
            return;
        }
        let id_track = track1.data.tracks.items[0].id;
        
        const recommendations = await axios.get(`https://api.spotify.com/v1/recommendations?seed_artists=${id_artist}&seed_genres=${req.body.genre}&seed_tracks=${id_track}&limit=${limit}`, 
        {
            headers: { 
                Authorization: `Bearer ${token}` 
            },
        });

        // if (recommendations.data.tracks.length == 0) {
        //     res.render("invalid", {field: "genre"});
        //     return;
        // }

        let recs = new Array(limit);
        let artists = new Array(limit);
        let rec = null;
        for (let i = 0; i < limit; i++){ 
            rec = recommendations.data.tracks[i];
            artists[i] = rec.artists[0].name;
            recs[i] = `${rec.name} by ${artists[i]}`;
        }

        let playList = { 
            name: req.body.playlist,
            songs: recs
        }

        try {
            await client.connect();
            // let playList = {
            //     name: req.body.playlist,
            //     songs: recs
            // };
            await insertPlayList(client, databaseAndCollection, playList);
            res.render("recommendations", playList);
        } catch (e) {
            console.error(e);
        } finally {
            await client.close();
        }

        
    }
    catch(error) {
        console.log(error);
    }
});

async function getToken() {
    try {
        const data = "grant_type=client_credentials";

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

async function insertPlayList(client, databaseAndCollection, playlist) {
    const filter = { name: playlist.name };
    const options = { upsert : true };
    return await client.db(databaseAndCollection.db)
        .collection(databaseAndCollection.collection)
        .replaceOne(filter, playlist, options);
}

// async function deleteAll(client, databaseAndCollection) {
//     const result = await client.db(databaseAndCollection.db)
//                    .collection(databaseAndCollection.collection)
//                    .deleteMany({});
//     return result.deletedCount;
// }

async function queryPlaylist(client, databaseAndCollection, name) {
    let filter = { name: name };
    return await client.db(databaseAndCollection.db)
        .collection(databaseAndCollection.collection)
        .findOne(filter);
}

async function queryPlaylists(client, databaseAndCollection) {
    return await client.db(databaseAndCollection.db)
        .collection(databaseAndCollection.collection)
        .find({}, { name: 1 })
        .toArray();
}

async function deletePlaylists(client, databaseAndCollection) {
    return await client.db(databaseAndCollection.db)
        .collection(databaseAndCollection.collection)
        .deleteMany({});
}
