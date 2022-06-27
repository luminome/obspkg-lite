const row_temp = document.getElementById('row_template');
const col_temp = document.getElementById('col_template');
const col_group_temp = document.getElementById('col_group_template');
const viewing_area = document.getElementById('view-area');
const text_out = document.getElementById('welcome');

const nav_stack = document.getElementById("nav_stack");

const main = document.getElementById('main-view');
const levels = ["Y", "M", "D", "null"];
const meta_points_count = 1626;

let selection = {"Y":[], "M":[], "D":[]};
let request_list_snapshot = [[],[],[]];
let request_list = [[],[],[]];
let loaded = {};
let requested = {};
let data_stash = {};
let point_data_stash = {};
let process_delay = null;



const normalize_val = (val, mi, ma) => (val - mi) / (ma - mi);
const display_scheme = [
	{n:'dn', k:1, max:null, mean_col:"rgba(255, 0, 0, 0.75)", max_col:"rgba(255, 0, 0, 0.25)"},
	{n:'up', k:0, max:null, mean_col:"rgba(0, 0, 255, 0.75)", max_col:"rgba(0, 0, 255, 0.25)"},
]

const make_table = (obj) => {
	let html = '';
	Object.entries(obj).map((k) => html += `<div class="tr"><div class="td">${k[0]}</div><div class="td">${k[1].toString()}</div></div>`);
	return `<div class="table">${html}</div>`;
}

function selection_filter(attr, code){
	const index = selection[attr].indexOf(code);
	if(index === -1){
		selection[attr].push(code);
	}else{
		selection[attr].splice(index, 1);
	}
	selection[attr].sort();
}

function selection_list(list, lv){
	if(lv>2) return;
	const sel_list = selection[Object.keys(selection)[lv]];
	if(list.length === 0){
		list[lv] = Array.from(sel_list);
	}else{
		let sublist = Array.from(list[lv-1]);
		list[lv] = [];
		for(let j of sel_list){
			for(let k of sublist){
				list[lv].push(parseInt(k+j));
			}
		}
	}
	list[lv].sort();
	lv += 1;
	selection_list(list, lv);
}

function process_trace(v){
	if(v===1) process_delay = Date.now()
	if(v===-1) {
		const delta = {'elapsed':`${Date.now() - process_delay}ms`};
		//text_out.innerHTML += make_table(delta);
	}
}

class button {
	constructor(index, label, attr, click_handler) {
		this.element = col_temp.cloneNode(true);
		this.element.classList.remove('hidden');
		this.element.setAttribute('id',`button-${label}`);
		this.element.querySelector(".label").innerHTML = label;
		// this.element.innerHTML = label;
		this.element.addEventListener('click', this.register_click);
		this.element.parent = this;
		
		this.refr = null;//label;
		this.attr = attr;
		
		this.handler = click_handler;
		this.data = {};
		this.group = null;
		this.selected = false;
		this.image = document.createElement('canvas');
		this.image.width = 200;
		this.image.height = 200;
		this.image.classList.add('image');
		this.element.appendChild(this.image);
		this.init_image();
		return this;
	}
	
	init_image(){
	    if (this.image.getContext) {
			const ctx = this.image.getContext('2d');
			const w = 200;
			const h = 200;
			ctx.strokeStyle = '#FFFFFF33';
			ctx.fillStyle = '#FFFFFF33';
  			ctx.beginPath();
  			ctx.moveTo(0, 0);
  			ctx.lineTo(w, h);
			ctx.lineTo(0, h);
			ctx.lineTo(0, 0);
			ctx.closePath();
			ctx.fill();
	    }
	}
	
	click(){
		const prev_level = levels[levels.indexOf(this.attr)-1];
		const next_level = levels[levels.indexOf(this.attr)+1];
		
		selection_filter(this.attr, this.refr);
		
		request_list = [];
		selection_list(request_list,0);
		
		// list of every load required at each level.
		const display = ['none', 'flex'];
		
		for(let r = 0; r<request_list.length; r++){
			const row = document.getElementById('attr-'+levels[r+1]);
			if(row){ 
				row.style.display = display[+(request_list[r].length > 0)];
				if(row.style.display === 'none'){
					for(let c of row.children){
						c.classList.remove('selected');
						if(c.parent.selected){
							selection_filter(c.parent.attr, c.parent.refr);
							c.parent.selected = false;
						}
					}
				}
			}
			
			for(let t_code of request_list[r]){
				process_trace(1);
				if(!loaded.hasOwnProperty(t_code)){
					requested[t_code] = true;
					this.handler(levels[r+1], t_code);					
				}
			}
		}
		
		
		//text_out.innerHTML = make_table(selection);
		
		const lv_r = request_list.map((r,i) => r.length>0).lastIndexOf(true);
		if(lv_r >= 0){
			const qualified = -1 === request_list[lv_r].map(t_code => loaded.hasOwnProperty(t_code)).indexOf(false);
			if(qualified){
				const point_result = process_point_means();
				const attr_result = process_attr_means(this.attr);
			} 
		}else{
			console.log('load default view here @156');
		}
		//console.log('qualified',levels[lv_r],qualified);
		
		this.element.classList.add('visited');
		this.element.classList.remove('selected_closed');
		this.element.classList.toggle('selected');
		this.selected = !this.selected;

		nav_stack.update();
		// log.nav.echo(['clicked']);
		
		// 
		// text_out.innerHTML += make_table(request_list);
		// text_out.innerHTML += make_table(this.data);

	}
	
	register_click(){
		this.parent.click();
	}
}

function display_bar(point, maximums, ctx, baseline, index, width){
	ctx.clearRect(0, 0, width, baseline*2);
	for(let e of display_scheme){
		const maxnorm = normalize_val(point[e.n+'_max'], 0.0001, maximums[e.n+'_max']);
		ctx.fillStyle = e.max_col;
		const maxy = e.k == 0 ? baseline - (maxnorm*baseline) : baseline;
		ctx.fillRect((index*(width+1)), maxy, width, maxnorm*baseline);
	
		const field_name = '_mean'; //point.hasOwnProperty('is_daily') ? 'w_real' : '_mean';
		const meannorm = normalize_val(point[e.n+field_name], 0.0001, maximums[e.n+'_max']);
		ctx.fillStyle = e.mean_col;
		const meany = e.k == 0 ? baseline - (meannorm*baseline) : baseline;
		ctx.fillRect((index*(width+1)), meany, width, meannorm*baseline);
	}
}

function display_events_ticks(point, ctx, baseline, width){
	ctx.fillStyle = '#FFFFFF33';
	for(let cr = 0; cr < point.events_parse.length; cr++){
		ctx.fillRect(parseInt(point.events_parse[cr]*(width)), (baseline*2)-10, 4, baseline*2);
	}
}

function display_hybrid_points(result_set, maximums){
	console.log('display_hybrid_points');
	const fields = Object.keys(result_set);
	
	const baseline = viewing_area.parentNode.clientHeight/2;
	viewing_area.width = meta_points_count*3.0;
	viewing_area.height = baseline*2;
	
	if (viewing_area.getContext) {
		const ctx = viewing_area.getContext('2d');
		for(let i = 0; i<meta_points_count; i++){
			const point = {id:i};
			for(let f of fields) point[f] = result_set[f][i];
			display_bar(point, maximums, ctx, baseline, i, 3.0);
		}
	}
}

function display_hybrid_attrs(level_char, result_set, maximums){
	console.log('display_hybrid_attrs');
	const keys = Object.keys(result_set);
	const row = document.getElementById('attr-'+level_char);
	const baseline = 32.0;

	for(let cr = 0; cr < row.children.length; cr++){
		if(cr > keys.length-1){
			row.children[cr].classList.add('hidden');
		}else{
			row.children[cr].classList.remove('hidden');
			const point = result_set[keys[cr]];
			const can = row.children[cr].parent.image;
			can.width = window.innerWidth / point.segment;
			can.height = 64;
			const ctx = can.getContext('2d');
			
			display_bar(point, maximums, ctx, baseline, 0, can.width);
			if(point.events_parse) display_events_ticks(point, ctx, baseline, can.width);
		}
	}
}


function process_attr_means(has_attr=null){
	console.log('process_attr_means', has_attr);
	
	const active_levels = request_list.map((r,i) => r.length>0);
	const check_in = Object.entries(selection)
		.map((r,i) => r[1].toString() !== request_list_snapshot[i]);
	
	let level_number = request_list.map((r,i) => r.length>0).lastIndexOf(true);
	let level_char = levels[level_number+1];
	let p_sets = null;
	
	request_list_snapshot = Object.entries(selection).map((r,i) => r[1].toString());
	
	for(let v = 0; v<check_in.length;v++){
		if(active_levels[v] && check_in[v]){			
			p_sets = levels.slice(v+1,level_number+2);
		}
	}
	
	const events_cap = {};
	
	const attr_event_filter = (attr) =>{
		const events = JSON.parse(attr.events);
		let adjusted;
		if(events){
			adjusted = events.map(e => (e-attr.indx)/attr.len);
		}
		// console.log(attr.time_code, 'pass', events, attr.len, adjusted);
		
		// console.log(attr.time_code, 'adjusted',adjusted);
		return adjusted;///events.map(e => (attr.indx-e)/attr.len);//position on n < 1
	};
	
	
	
	console.log('process_attr_means level_number',level_number);
	
	if(p_sets){
		for(let nnp of p_sets){
			level_number = (levels.indexOf(nnp)-1);
			level_char = nnp;
			do_the_thing(level_number, level_char);
		}
	}else{
		do_the_thing(level_number, level_char);
	}
	
	
	
	function do_the_thing(level_number, level_char){
		if(level_char === "null") return false;
		let maximums = get_limits(level_number);
		const terms = ['up_mean', 'dn_mean', 'up_max', 'dn_max', 'events'];
		const attr_data = data_stash[level_char];
		const attr_data_keys = Object.keys(attr_data);
		let these_keys;
		let batch = [];
		let batch_len = [];
		let result_set = {};
	

		if(level_number >= 0){
			for(let t of request_list[level_number]){
				const ke = attr_data_keys.filter(e => e.indexOf(t) === 0);
				batch.push(ke);
				batch_len.push(ke.length);
			}
			batch_len = Math.max(...batch_len);
			//console.log('alert()',batch);
			for(let i = 0; i<batch_len; i++){
				const attr = {segment:batch_len};//attr_data_keys.length};
				for(let t of terms){
					let t_val = 0;
					for(let b of batch){//have indices of collections here;
						if(t === 'events'){
							//events indices differ for daily attr obs
							const attrs = data_stash[level_char][b[i]];
							//attr['len'] = attrs.len;
							if(attrs && attrs['events']){
								console.log(attrs['events']);
								if(!attr.hasOwnProperty('events_parse')) attr['events_parse']=[];
								attr['events_parse'].push(...attr_event_filter(attrs));
							}
						}else{
							t_val += data_stash[level_char][b[i]] === undefined ? 0 : data_stash[level_char][b[i]][t];
						}
						
					}
					if(t !== 'events'){
						t_val /= batch.length;
						attr[t] = parseFloat(t_val.toFixed(4));
					}
				}
				result_set[i] = attr;
			}
			
		}else{
			result_set = {...data_stash[level_char]};
			Object.keys(result_set).forEach(r => {
				if(result_set[r]['events']){
					result_set[r]['events_parse'] = attr_event_filter(result_set[r]);
				}
				result_set[r]['segment'] = Object.keys(result_set).length;
			});
			
			//events are already packed here
		}
		
		//console.log('alert()',result_set,data_stash[level_char]);
		
		display_hybrid_attrs(level_char, result_set, maximums);
	}
	
	
	
	
	
	
	
	
	
}

function process_point_means(){
	console.log('process_point_means','not bypassed');
	// console.log('process_point_means','bypassed');
	// return;
	
	const level_number = request_list.map((r,i) => r.length>0).lastIndexOf(true);
	const level_char = levels[level_number];
	
	let maximums;
	
	if(request_list[level_number] === undefined) return false;
	
	let terms = [];
	//different types of data (testing).
	// if(level_char==='D'){
	// 	terms = ['upw_real', 'dnw_real'];
	// }else{
	// 	terms = ['up_mean', 'dn_mean', 'up_max', 'dn_max'];
	// }
	
	terms = ['up_mean', 'dn_mean', 'up_max', 'dn_max'];
	
	const len = request_list[level_number].length;
	//console.log(level_char, 'records:', len);
	
	let result_set = {};
	
	for(let t of terms){
		let filledArray = new Array(meta_points_count).fill(0);
		for(let k of request_list[level_number]){
			const batch = point_data_stash[level_char][k];
			batch.map(b => b[t]).forEach((v,n) => filledArray[n] += v);
		}
		const resumee = filledArray.map(n => parseFloat((n/len).toFixed(4)));
		result_set[t] = resumee;
		//all point means for selected point ranges.
	}
	//
	
	
	const average = arr => (arr.reduce((a,b) => a + b, 0) / arr.length).toFixed(4);
	const averages = {};
	
	for(let t of terms){
		averages[t+'_avg'] = average(result_set[t]);
	}
	
	//text_out.innerHTML += make_table(averages);
	
	const field = level_char === 'D' ? '_mean' : '_max';
	
	if(level_char==='D') result_set.is_daily = true;
	
	maximums = {'up_max': Math.max(...result_set['up'+field]), 'dn_max': Math.max(...result_set['dn'+field])};

	//text_out.innerHTML += make_table(maximums);
	console.log('process_point_means', result_set);
	document.wudi_point_callback(result_set);
	
	display_hybrid_points(result_set, maximums);
	return true;
}

function get_limits(force_level=null){
	
	const level_number = force_level !== null ? force_level : request_list.map((r,i) => r.length>0).lastIndexOf(true);
	const level_char = levels[level_number+1];
	
	console.log('get_limits', level_number+1, level_char);
	if(level_char === "null") return {};
	
	const attr_data = data_stash[level_char];
	const attr_data_keys = Object.keys(attr_data);
	//in an effort to get the maximum values for the topmost selection., this is fancy.
	const validate = (e,fieldname) => {
		if(level_number >= 0){
			let flag = false;
			for(let test of request_list[level_number]){
				if(e.indexOf(test) === 0) flag = true;
			}
			return flag ? data_stash[level_char][e][fieldname] : 0;
		}else{
			return data_stash[level_char][e][fieldname];
		}
	}
	
	const max_up = attr_data_keys.map(e => validate(e,'up_max'));
	const max_dn = attr_data_keys.map(e => validate(e,'dn_max'));
	return {'up_max': Math.max(...max_up), 'dn_max': Math.max(...max_dn)};
}

function populate_from_json(data, click_handler){
	
	let req_mode = data.attr.meta.mode;
	let req_sub = data.attr.meta.sub;
	
	console.log('populate_from_json', req_mode, req_sub, data);

	
	
	let target = document.getElementById(`attr-${req_mode}`);
	let group = null;
		
	loaded[req_sub] = true;

	if(target){
		const bl = target.children.length;
		if(bl < data.attr.data.length){
			for(let e = bl; e<data.attr.data.length; e++){
				const row = data.attr.data[e];
				const label = req_mode === 'Y' ? row.time_code : ((e+1).toString().padStart(2, '0'));
				//const label = ((e+1).toString().padStart(2, '0'));
				const btn = new button(e, label, req_mode, click_handler);
				
				btn.refr = req_mode === 'Y' ? row.time_code : ((e+1).toString().padStart(2, '0'));
				target.appendChild(btn.element);
			}
		}
	}
	
	
	if(data.hasOwnProperty('points')){
		const points_level = levels[levels.indexOf(`${req_mode}`)-1];
		// console.log('points', req_mode, req_sub, points_level);
		if(!point_data_stash.hasOwnProperty(points_level)) point_data_stash[points_level] = {};
		point_data_stash[points_level][req_sub] = [];
		data.points.data.forEach((d) => { point_data_stash[points_level][d.time_code].push(d) });
	}

	if(req_mode !== 'null'){
		if(!data_stash.hasOwnProperty(req_mode)) data_stash[req_mode] = {};
		data.attr.data.forEach((d) => { data_stash[req_mode][d.time_code] = d });
	}
	
	
	// if(data.hasOwnProperty('points'){ || req_mode === 'null'){
	// 	const stash_under = req_mode === 'null' ? 'D' : levels[levels.indexOf(req_mode)-1];
	// 	const data_set = req_mode === 'null' ? data.attr.data : data.points.data;
	// 	const data_time_code = data_set[0].time_code;
	//
	// 	if(!point_data_stash.hasOwnProperty(stash_under)) point_data_stash[stash_under] = {};
	// 	point_data_stash[stash_under][data_time_code] = [];
	// 	data_set.forEach((d) => { point_data_stash[stash_under][data_time_code].push(d) });
	// }
	//
	// if(req_mode !== 'null'){
	// 	if(!data_stash.hasOwnProperty(req_mode)) data_stash[req_mode] = {};
	// 	data.attr.data.forEach((d) => { data_stash[req_mode][d.time_code] = d });
	// }
	
	
	// console.log(data_stash);
	// console.log(point_data_stash);
	
	const result = Object.keys(requested).length === Object.keys(requested).filter((x,i) => { return loaded.hasOwnProperty(x); }).length;
	
	if(result){
		process_trace(-1);
		requested = {};
		const points_processed = process_point_means();
		const attrs_processed = process_attr_means();
	} 
	

	
	//console.log(data_stash[level]);
	
	// const points_parent = caller === null ? null : caller.parent;
	// let points = data.hasOwnProperty('points') ? data.points : null;
	//
	// if(points && !points.data.length){
	// 	console.log('no point');
	// 	points = data.attr;
	// }
	//
	// display_point_data(points_parent, points);

}

function make_row(row_id){
	const row = row_temp.cloneNode(true);
	row.setAttribute('id',`attr-${row_id}`);
	row.classList.remove('hidden');
	return row;
}

function init(){
	request_list_snapshot = Object.entries(selection).map((r,i) => r[1].toString());
	const names = ['Y','M','D'];
	for(let n of names){
		main.appendChild(make_row(n));
	}
}


export {
	init,
	populate_from_json
}



/*
0 Object

attr: "D"
dn_max: 7.53951
dn_mean: 3.72204
dn_min: 0.01568
events: null
id: 5812
indx: 5610
len: 1
time_code: 19950512
up_max: 7.51931
up_mean: 3.63294
up_min: 0.00052

Object Prototype




0 Object

attr: "p"
dn_events: null
dn_max: null
dn_mean: 0.00035
dn_min: null
id: 9508849
point_id: 1
time_code: 19950617
up_events: null
up_max: null
up_mean: 0.00023
up_min: null

Object Prototype
*/