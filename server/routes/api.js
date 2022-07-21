const express = require('express');
const router = express.Router();
const api_service = require('../services/api');



/* GET quotes listing. */
router.get('/', function (req, res, next) {
    try {
        const items = api_service.get_all(req.query).data;
        const replacer = (key, value) => value === null ? '' : value // specify how you want to handle null values here
        const header = Object.keys(items[0])
        const csv = [
            header.map(h => `'${h}'`).join(','), // header row first
            ...items.map(row => header.map(fieldName => JSON.stringify(row[fieldName], replacer)).join(','))
        ].join(',')
        res.write(csv);
        res.end();
        console.log(req.query, 'api req was called.');
        return true;

    } catch (err) {
        console.error(`Error while getting what `, err.message);
        next(err);
    }
});


module.exports = router;
	