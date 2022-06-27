const serveStatic = require('serve-static')
const path = require("path");

module.exports = function (app) {
  app.use(serveStatic('static'))
}
