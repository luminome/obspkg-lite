const express = require('express');
const router = express.Router();
const wudi = require('../services/wudi');

/* GET quotes listing. */
router.get('/', function(req, res, next) {
  try {
    res.json(wudi.getBaseView(req.query.page, req.query.mode, req.query.sub));
  } catch(err) {
    console.error(`Error while getting wudi `, err.message);
    next(err);
  }
});

// /* POST quote */
// router.post('/', function(req, res, next) {
//   try {
//     res.json(quotes.create(req.body));
//   } catch(err) {
//     console.error(`Error while adding wudi `, err.message);
//     next(err);
//   }
// });
//
// module.exports = router;
