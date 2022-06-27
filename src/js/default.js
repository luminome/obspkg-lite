import {data_loader as fetchAll} from './data-loader.js';
const output_field = document.getElementById('info');
const api_result_field = document.getElementById('api-result');

const d = new Date();
output_field.innerHTML += d.toUTCString();

const make_table = (obj) => {
	let html = '';
	//table header
	html += `<div class="tr header">`;
	Object.entries(obj[0]).map((k) => {
		html += `<div class="td">${k[0]}</div>`;
	});
	html += `</div>`;
	//table content
	Object.entries(obj).map((k) => {
		html += `<div class="tr">`;
		for(let v of Object.keys(k[1])){
			console.log(k[1][v],'ok');
			html += `<div class="td">${k[1][v]}</div>`;
		}
		html += `</div>`;
	});
	return `<div class="table">${html}</div>`;
}

const result = fetchAll([['test','/req?sample=none']],null).then(result => {
	api_result_field.innerHTML = make_table(result.test.data);
	console.log(result.test.data);////JSON.stringify(result.test);//.toString();
});
