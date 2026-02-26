const https = require('https');
const fs = require('fs');

const url = 'https://upload.wikimedia.org/wikipedia/commons/1/18/Air_on_the_G_String_%28ISRC_USUAN1100373%29.mp3';

const file = fs.createWriteStream('./public/air_on_g.mp3');

https.get(url, {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    }
}, (res) => {
    if (res.statusCode === 301 || res.statusCode === 302) {
        https.get(res.headers.location, (res2) => {
            res2.pipe(file);
        });
    } else {
        res.pipe(file);
    }
});
