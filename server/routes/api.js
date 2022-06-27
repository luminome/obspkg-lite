const express = require('express');
const router = express.Router();
const api_service = require('../services/api');

/* GET quotes listing. */
router.get('/', function(req, res, next) {

  try {
	res.json(api_service.get_all(req.query));
	// res.json(req.query);
	console.log(req.query);
	return true;
	
  } catch(err) {
    console.error(`Error while getting what `, err.message);
    next(err);
  }
});



module.exports = router;
	