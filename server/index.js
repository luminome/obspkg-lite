const express = require('express');
const serveStatic = require('serve-static');
const app = express();
const config = require('./config');
const port = config.default_port || process.env.PORT;

app.use(express.static('dist'));

const api_router = require('./routes/api');
const wudi_router = require('./routes/wudi');

app.use(serveStatic('static'));

app.use(express.json());
// app.use(express.raw());
app.use('/req', api_router);
app.use('/wudi', wudi_router);

app.listen(port, () => {
  console.log(`obspkg app listening at http://localhost:${port}`);
});