const db = require('../services/wudi_db');

/*
//"tim, pid, u_tl, d_tl, raw, e_ct, e_ls
*/

function get_all(query = null) {
    try {
        if (query.table) {
            const meta = {};
            const data = db.query(`SELECT *, rowid
                                   FROM wudi_points
                                   WHERE eco != 0`, []);
            return {
                data,
                meta,
                query
            }

        } else {
            const fields = ["u_tl", "d_tl", "e_ct", "e_ls"];
            const fields_daily = ["rowid", "pid", "raw"];
            //const fields_daily = ["raw", "evt"];
            if (query.tim === '40') fields.pop();
            let data = {none: null};
            let meta = {none: null};

            if (query.tim) {

                if (query.special) {
                    //#pid IN (58,59,60) AND tim LIKE '______15'
                    let req_a = query.special;
                    if (!Array.isArray(req_a)) req_a = req_a.split(',');

                    if (query.tim === 'all') { //ALL TIME
                        data = db.query(`SELECT raw
                                         FROM wudi_daily
                                         WHERE pid IN (${req_a.join(',')})
                                         AND tim LIKE '______15'
                                         ORDER BY pid`,[]);
                        meta = [{len:data.length}];

                    } else if (query.tim.length < 5) { //YEAR
                        data = db.query(`SELECT raw
                                         FROM wudi_daily
                                         WHERE pid IN (${req_a.join(',')})
                                         AND tim LIKE '${query.tim}__15'
                                         ORDER BY pid`,[]);
                        meta = [{len:data.length}];

                    } else if (query.tim.length < 7) { //MONTH
                        data = db.query(`SELECT raw
                                         FROM wudi_daily
                                         WHERE pid IN (${req_a.join(',')})
                                         AND tim LIKE '${query.tim}__'
                                         ORDER BY pid`,[]);
                        meta = [{len:data.length}];
                    }

                    console.log(req_a, req_a[1]);

                } else {


                    if (query.tim.length < 7) {
                        data = db.query(`SELECT ${fields.join(',')}
                                         FROM wudi_derivative
                                         WHERE tim = ${query.tim} `, []);
                        meta = db.query(`SELECT *
                                         FROM wudi_derivative_meta
                                         WHERE tim = ${query.tim} `, []);
                    } else {
                        data = db.query(`SELECT ${fields_daily.join(',')}
                                         FROM wudi_daily
                                         WHERE tim = ${query.tim} `, []);
                        meta = db.query(`SELECT *
                                         FROM wudi_derivative_meta
                                         WHERE tim = ${query.tim.substring(0, 6)} `, []);
                    }
                }
                return {
                    data,
                    meta,
                    query
                }

            } else {
                const data = {error: ['wudi_db', 'no tim(e) specified.']};
                return {
                    data,
                    query
                }
            }
        }


    } catch (err) {
        //console.error(`Error while getting what `, err.message);
        const data = {error: ['wudi_db', err.message]};
        return {
            data,
            query
        }
    }
}

module.exports = {
    get_all
}


/*
const db = require('../services/wudi_db');
const config = require('../config');

function getBaseView(page = 1, mode = null, sub = null) {
	
	// const qs = `SELECT point.json, point_data.upw_real, point_data.dnw_real from point INNER JOIN point_data on point.id = point_data.point_id WHERE point_data.attr = '40-year-mean'`;
	//   	const data = db.query(qs,[]);
	let data;
	
	if(mode === 'times'){
		data = db.query(`SELECT id, time_code FROM time_data`,[]);
	
	}else if(mode === 'points'){
		data = db.query(`SELECT * FROM point_time_data WHERE time_code = ?`,[sub]);
		
	}else if(mode === 'Y'){
		data = db.query(`SELECT * FROM time_data WHERE attr = ?`,[mode]);

	}else if(mode === 'M'){
		refer_year = `${sub}%`
		data = db.query(`SELECT * FROM time_data WHERE attr = ? AND time_code LIKE ?`,[mode, refer_year]);	
	
	}else if(mode === 'D'){
		refer_month = `${sub}%`
		data = db.query(`SELECT * FROM time_data WHERE attr = ? AND time_code LIKE ?`,[mode, refer_month]);	
		
	}else if(mode === 'null'){
		refer_day = `${sub}`
		data = db.query(`SELECT * FROM time_data WHERE time_code = ?`,[refer_day]);	
		
		// refer_day = `${sub}%`
		// data = db.query(`SELECT * FROM point_data WHERE time_code = ?`,[sub]);
	}else{
		data = {'no_result':null};
	}
	
  	//const data = db.query(`SELECT json FROM point`,[]); //, [offset, config.listPerPage]);
  	//id,lon,lat,lonmid,latmid
  	const meta = {page, mode, sub};

  	return {
    	data,
    	meta
  	}
}

function getMultiple(page = 1) {
  const offset = (page - 1) * config.listPerPage;
  const data = db.query(`SELECT * FROM all_years_mean LIMIT ?,?`, [offset, config.listPerPage]);
  const meta = {page};

  return {
    data,
    meta
  }
}

function validateCreate(quote) {
  let messages = [];

  console.log(quote);

  if (!quote) {
    messages.push('No object is provided');
  }

  if (!quote.quote) {
    messages.push('Quote is empty');
  }

  if (!quote.author) {
    messages.push('Author is empty');
  }
  
  if (messages.length) {
    let error = new Error(messages.join());
    error.statusCode = 400;

    throw error;
  }
}

function create(quoteObj) {
  validateCreate(quoteObj);
  const {quote, author} = quoteObj;
  const result = db.run('INSERT INTO quote (quote, author) VALUES (@quote, @author)', {quote, author});
  
  let message = 'Error in creating quote';
  if (result.changes) {
    message = 'Quote created successfully';
  }

  return {message};
}

module.exports = {
	getMultiple,
	getBaseView,
  	create
}
*/