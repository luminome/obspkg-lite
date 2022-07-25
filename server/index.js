const express = require('express');
const serveStatic = require('serve-static');
const app = express();
const config = require('./config');
const port = process.env.PORT || config.default_port;

app.use(express.static('dist'));

const map_router = require('./routes/obs-map');
const wudi_router = require('./routes/obs-wudi');

app.use(serveStatic('static'));
const bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(express.json());

app.use('/map', map_router);
app.use('/wudi', wudi_router);

app.listen(port, () => {
  console.log(`obspkg-lite app listening at http://localhost:${port}`);
});