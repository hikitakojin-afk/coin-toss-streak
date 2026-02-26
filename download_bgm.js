import https from 'https';
import fs from 'fs';

const options = {
    hostname: 'upload.wikimedia.org',
    port: 443,
    path: '/wikipedia/commons/e/e6/Bach_Air_on_the_G_String.ogg',
    method: 'GET',
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
};

const file = fs.createWriteStream('./public/air_on_g.ogg');

https.get(options, (res) => {
    if (res.statusCode === 301 || res.statusCode === 302) {
        https.get(res.headers.location, (res2) => {
            res2.pipe(file);
        });
    } else {
        res.pipe(file);
    }
});
