import {wudi} from './wudi-pkg.js'
import * as display from './display-elements.js'
console.log(wudi.name);
const nav_stack = document.getElementById("nav_stack");

let load_queue = {}
let time_table = null;


function load_trace(v, url, error=null){
	if(v===1) load_queue[url] = Date.now()
	if(v===-1) {
		const prev_time = load_queue[url];
		const delta = `\'${url}\' : ${Date.now() - prev_time}ms ${error}`;
		document.relay(delta);	
	}
}


function handler(mode, sub=null){
	const call = [
		['attr',`/wudi?mode=${mode}&sub=${sub}`],
		['points',`/wudi?mode=points&sub=${sub}`]
	]
	wudi.get(call, load_trace, final);
}


function final(result){
	if(result.hasOwnProperty('times')){
		time_table = result.times.data;
	}else{
		display.populate_from_json(result, handler);
	}
	nav_stack.update();
}

display.init();
wudi.get([['times','/wudi?mode=times']], load_trace, final);
wudi.get([['attr','/wudi?mode=Y']], load_trace, final);
