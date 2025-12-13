const express = require('express');
const router = express.Router();
const { needsAuth } = require('../middleware/auth');

const clientId = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

let token = undefined;
let tokenExpires = 0;

// Token holen & speichern
async function getSpotifyToken() {
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  const data = await response.json();
  token = data.access_token;
  tokenExpires = Date.now() + data.expires_in * 1000; // Spotify gibt expires_in = 3600

  return token;
}

// Token holen oder erneuern, wenn abgelaufen
async function getValidToken() {
  if (!token || Date.now() >= tokenExpires) {
    return await getSpotifyToken();
  }
  return token;
}

async function getSongInfo(trackId, token) {
  const response = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
    headers: {
      Authorization: 'Bearer ' + token,
    },
  });

  return response;
}

router.get("/trackinfo", needsAuth, async (req, res) => {
  const { trackId } = req.query;

  if (!trackId) {
    return res.status(400).json({ message: "Invalid Spotify Track Id." });
  }

  let validToken = await getValidToken(); // always get fresh token
  let response = await getSongInfo(trackId, validToken);

  // If token expired -> refresh & retry
  if (response.status === 401) {
    validToken = await getSpotifyToken();
    response = await getSongInfo(trackId, validToken);
  }

  const data = await response.json();
  if(response.status !== 200){
    console.log(data);
    return res.status(500).json({ message: 'Internal Error' });
  }

  const result = {
    title: data.name,
    interpret: data.artists.map(a => a.name).join(", "),
    imageUrl: data.album.images[0].url,
    album: data.album.album_type == 'single' ? "" : data.album.name,
    releaseDate: data.album.release_date + (data.album.release_date_precision == 'day' ? "T00:00" : "")
  };

  return res.status(200).json({trackInfo: result});
});

module.exports = router;
