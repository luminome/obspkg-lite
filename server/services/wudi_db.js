const path = require('path');
const Sqlite = require("better-sqlite3");
const db = new Sqlite(path.resolve('data-resources/wudi.db'), {fileMustExist: true});

function query(sql, params) {
  return db.prepare(sql).all(params);
}

function run(sql, params) {
  return db.prepare(sql).run(params);
}

module.exports = {
  query,
  run
}
