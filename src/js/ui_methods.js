import {main_menu as a_menus, pk as a_dpk, filters} from './structures';
import {dragControls} from './drags.js';


let active_menus = null;
let container = null;
let all_magics = null;
let dpk = {};
let menus = {};






class data_guide {
	constructor(name) {


	}

}


//for data or general displacement.
class guide {
	constructor(name) {


	}

	build_from_data_vertices(){
		//guides from data points
	}


	build_from_generic_vertices(){
		//guides from land shapes
	}

	interact(){

	}


}




function naturalize_on_loop(value, side = false) {
	if (value > 1) return side ? value - 1 : 0;
	if (value < 0) return side ? 1 + value : 1;
	return value;
}

function slider_image_draw(canvas, pixel_width, segments) {

	// const rect = container_div.getBoundingClientRect();
	// const w = rect.width;
	// const canvas = container_div.querySelector(".slider-image");
	// const marker = container_div.querySelector(".slider-marker");
	canvas.setAttribute('width', pixel_width);
	const segment_width = pixel_width/segments;
	const image_height = 24;
  if (canvas.getContext) {
    const ctx = canvas.getContext('2d');

    // ctx.beginPath();
    // ctx.moveTo(0,0);
    // ctx.lineTo(pixel_width, 0);
    // ctx.lineTo(pixel_width, image_height);
		// ctx.fillStyle = '#66666666';
    // ctx.fill();
		//
		// ctx.beginPath();
    // ctx.moveTo(0, 0);
    // ctx.lineTo(0, image_height);
    // ctx.lineTo(pixel_width, image_height);
		// ctx.fillStyle = '#FFFFFF66';
    // ctx.fill();
		ctx.strokeStyle = '#FFFFFF66';
		ctx.fillStyle = '#FFFFFF66';
		ctx.font = '9px heavy_data';
		for(let i=0;i<segments;i++){
			ctx.beginPath();
			ctx.moveTo(segment_width*i, 0);
			ctx.lineTo(segment_width*i, image_height);
			ctx.stroke();

			ctx.fillText(i, (segment_width*i)+2, 9);


		}

  }
	//
	// //canvas.style.left = parseInt(w/2)+'px';
	// marker.style.left = parseInt((w/2)-1.5)+'px';
	// return rect;
}

function slider_image_set_pos(canvas, pixel_x_pos) {
	canvas.style.left = parseInt(pixel_x_pos)+'px';
}

class slider {
	constructor(name, parent_container, vars) {
		this.name = name;
		this.vars = vars;
		this.image_rect = null;
		this.current_offset = null;
		this.seg_width = null;
		this.image_width = 3000.0;
		this.vars.adjusting = true;

		const header = document.getElementById("slider_temp").cloneNode(true);
		header.setAttribute('id',`slider-${name}`);
		header.style.visibility = 'visible';// ('visibility', 'visible');
		header.style.display = 'block';//table-row';
		header.querySelector(".label").innerHTML = name;
		// header.querySelector(".label-start").innerHTML = vars.data[0].ts;
		// header.querySelector(".label-end").innerHTML = vars.data[vars.data.length-1].ts;
		header.querySelector(".label-button").addEventListener('click', this.register_state);



		this.element = header;
		this.element.owner = this;
		this.label = this.element.querySelector(".slider-label");
		this.field = this.element.querySelector(".label-frame");
		this.field.innerHTML = vars.data[0].ts;

		this.active_area = this.element.querySelector(".slider-image-container");
		this.image = this.active_area.querySelector(".slider-image");
		this.marker = this.active_area.querySelector(".slider-marker");
		this.marker.addEventListener('click', this.register_reset_offset);


		dragControls(this.element, this.slider_interact, this.element, {passive: true});//camera_position

		parent_container.appendChild(header);
	}

	register_state(){
		const states = ['play','pause'];
		const el_super = this.parentElement.parentElement.owner;
		el_super.vars.playing = !el_super.vars.playing;
		this.innerHTML = states[+el_super.vars.playing];
		//console.log(this.parentElement.owner);//.owner);
	}


	register_set_label_pos(){
		this.label_rect = this.label.getBoundingClientRect();
		this.label.style.left = parseInt((this.image_rect.width/2.0)-(this.label_rect.width/2))+'px';
		this.label.style.top = '12px'; //parseInt(12-(this.label_rect.height/2))+'px';
	}

	register_ready(){
		this.image_rect = this.active_area.getBoundingClientRect();
		this.image_rect.width = window.innerWidth;
		console.log(this.label_rect);

		slider_image_draw(this.image, this.image_width, this.vars.data.length);
		//slider_image_draw(this.image, 3000.0, this.vars.data.length);
		const c = this.image_width;
		const ints = this.vars.data.length;
		this.seg_width = c/ints;

		this.current_offset = 0;//(this.image_rect.width/2.0);
		this.marker.style.left = parseInt((this.image_rect.width/2.0)-2)+'px';



		slider_image_set_pos(this.image, this.image_rect.width/2.0);//-(this.seg_width/2));
		//this.image.style.display = 'none';
		this.register_set_label_pos();
		//this.current_offset = slider_set_pos(zone, this.image_rect, 0);
	}


	register_reset_offset(evt){
		const e = this.parentElement.parentElement.owner;
		e.current_offset = e.image_rect.width/2.0;
		slider_image_set_pos(e.image, e.current_offset);
	}

	register_frame(frame){
		if(this.vars.playing && !this.vars.adjusting){
			// const c = this.image_rect.width; //2.0;
			// const crt = this.vars.frame + frame;
			// const ints = this.vars.data.length;
			// const segment_width = this.image_rect.width/ints;
			// const off = (crt/ints);
			// const nat = naturalize_on_loop(off, true);
			// this.vars.frame = parseInt(Math.ceil(nat*ints));
			// this.field.innerHTML = this.vars.frame+' '+(nat*ints).toFixed(3);
			//
			// const click = Math.round((nat)*ints);
			// const prw = (c/2)-(click*segment_width);
			//
			// this.current_offset = prw;
			//
			// slider_image_set_pos(this.image, prw);
			// //if(this.vars.frame >= this.vars.data.length) this.vars.frame = 0;
			// this.vars.callback([this.name, this.vars.frame]);
			this.register_delta(this.seg_width*(-frame), true);
		}
	}


	register_delta(delta, fixed=null){
		if(fixed){
			this.current_offset += delta;
		}else{
			this.current_offset += Math.pow(delta, 2) * Math.sign(delta);
		}

		const b = this.image_width;
		const c = this.image_rect.width;
		const ints = this.vars.data.length;
		let offset = (this.current_offset/b)*-1;//+0.5;

		const nat = naturalize_on_loop(offset, true);
		const position = (c/2)-(nat*b);

		this.current_offset = (nat*b)*-1;//-position;

		this.vars.prevframe = this.vars.frame;
		this.vars.frame = parseInt(Math.floor(nat*ints));

		this.field.innerHTML = this.vars.data[this.vars.frame].ts;//nat.toFixed(2)+' '+this.current_offset.toFixed(2);//this.vars.frame;

		if(this.vars.prevframe !== this.vars.frame) this.vars.callback([this.name, this.vars.frame]);

		slider_image_set_pos(this.image, position);
		this.register_set_label_pos();
		//this.register_frame(click);
	}

	/*
	bottom: 352
	height: 14.59375
	left: 135.875
	right: 1061
	top: 337.40625
	width: 925.125
	x: 135.875
	y: 337.40625
	* var rect = elem.getBoundingClientRect();
  console.log("height: " + rect.height);  */

	slider_interact(type, deltaX, deltaY, object, event){
		object.owner.vars.adjusting = type === 'drag';
		if(type === 'drag'){
			//console.log(event.target);
			//if(Math.abs(deltaX) <10)
			object.owner.register_delta(deltaX);
		}

	}

}



function recursive_toggle(item){
	for(let s in item.submenus){
		let t_item = item.submenus[s];
		const tgt = document.getElementById(`menu-${t_item}`);
		if(tgt){
			tgt.classList.toggle('menu_hidden');
			if(tgt.owner.state) recursive_toggle(tgt.owner);
		}
	}
}

class tree_view_item {
	constructor(string, id, submenus, lv){
		this.text = string;
		this.id = id;
		this.submenus = submenus;
		this.level = lv;
		this.state = true;
		this.element = null;
		this.marks = ['+','—'];
	}

	toggle(){
		this.state = !this.state;
		recursive_toggle(this);
		this.element.querySelector(".menuspecial").innerHTML = this.marks[+this.state];
	}

	action(){
		if(document.activeElement.type === 'text') return;
		this.owner.toggle();
	}

	attach(target){
		const header = document.getElementById("menu_header_temp").cloneNode(true);
		header.setAttribute('id',`menu-${this.id}`);
		header.classList.remove("template");
		header.querySelector(".menulabel").innerHTML = this.text;
		header.querySelector(".menulabel").style.paddingLeft = ((this.level-1)*6)+'px';
		header.querySelector(".menukey").style.display = 'none';
		header.querySelector(".menuspecial").innerHTML = '';
		header.owner = this;
		this.element = header;
		this.element.addEventListener('click', this.action);
		target.appendChild(this.element);
	}
}


function fast_unpack_object(obj){

	function unpack_obj(obj, obj_par, lv, part) {

		console.log(obj_par, obj);
		if(lv>3) return;
		for (const key in obj) {



			if(typeof(obj[key]) === 'object'){
				unpack_obj(obj[key], key, lv++, part);
			}else{
				console.log(key, obj[key]);
			}
		}

	}

	unpack_obj(obj, null, 0, 0);

	//console.log('fast',obj);
}

function info_tree_view(target_element, the_obj, filter=null){
	const active_filter = filter ? filters[filter] : null;
	let i = 0;
	let lex = [];

	function printline(p, k, v, lv){
		let v_lex = v;
		if(v instanceof Array || Array.isArray(v)) {
			v_lex = v.map((e, i) => typeof(e) !== 'object' ? e:null).join(', ');
		}
		if(typeof(v_lex) === 'object'){
			lex.push([lv, p, k]);
		}else{
			lex.push([lv, p, k, v_lex]);
		}
	}

	function relay(lv, name, int, value){
		let d_obj = {l:lv, name:name, int:int, value:value};
		return d_obj;//
	}

	function unpack_obj(obj, obj_par, lv, part){
		lv++;


		let ltc = []
		if(obj !== null && filter === null){
			ltc = Object.entries(obj).map((e, f) => (f+i));
			part['ltc'] = ltc;
			i += ltc.length;
		}

		let plc = 0;
		if(lv>5) return;

		for (const key in obj) {
			let part = null;
			let k_lex = key;
			if(active_filter && active_filter.hasOwnProperty(key)){
				k_lex = active_filter[key];
				//printline(obj_par, k_lex, obj[key], lv);
				//const rky = typeof(obj[key]) === 'object' ? 'None' : obj[key];
				let v_lex = obj[key];
				if(v_lex instanceof Array || Array.isArray(v_lex)) {
					v_lex = v_lex.map((e, i) => typeof(e) !== 'object' ? e:null).join(', ');
				}

				part = relay(lv, k_lex, ltc[plc], v_lex);
				lex.push(part);
			}else if(active_filter === null){
				const rky = typeof(obj[key]) === 'object' ? 'None' : obj[key];
				part = relay(lv, k_lex, ltc[plc], rky);
				lex.push(part);
				plc++;
			}



			if(typeof(obj[key]) === 'object'){
				unpack_obj(obj[key], key, lv, part);
			}

		}
	}

	unpack_obj(the_obj,'root',0,relay('root'));
	console.log(lex);

	let items = [];
	for(let i in lex){
		const t = lex[i];
		const string = t.value !== 'None' ? t.name+': '+t.value : t.name;
		const ht = new tree_view_item(string, t.int, t.ltc, t.l);
		ht.attach(target_element);
		items.push(ht);
	}

	items.forEach((i) => {if(i.level === 2) i.toggle()});


}


class menu_item {

	constructor(name, item_default) {
		this.name = name;
		this.value_internal = item_default;
		this.variable = null;
		this.aListener = function(val) {};
		this.element = null;//{};
		this.callback = null;
		this.submenus = null;
		this.container = null;
		this.nature = null;
		this.marks = ['+','—'];
	}

  set value(val) {
    this.value_internal = val;
    this.aListener(val);
  }

  get value() {
    return this.value_internal;
  }

  registerListener(listener) {
    this.aListener = listener;
  }

	toggle_state(initial=null) {
		//console.log(this);

		if(!this.element){
			this.do_trigger();
			return;
		}

		function recursive_toggle(item){
			//console.log(item.submenus);
			for(let s in item.submenus){
				let t_item = item.submenus[s];
				const tgt = document.getElementById(`menu-${t_item}`);
				if(tgt){
					tgt.classList.toggle('menu_hidden');
					if(menus.hasOwnProperty(t_item)){
						if(menus[t_item].object.value_internal) recursive_toggle(menus[t_item].object);
						//if (menus[t_item].object.submenus.length) recursive_toggle(menus[t_item].object);
					}
				}
			}
		}


		if(initial === null) {
			this.value = !this.value;
			this.element.classList.toggle(`${this.nature}_selected`);
			if(this.submenus.length) recursive_toggle(this);
			if(menus[this.name].hasOwnProperty('link')){
				window.location = menus[this.name].link;
			}
		}else{
			this.value = this.value_internal;
			if(this.submenus.length && !this.value){
				this.submenus.forEach(m => document.getElementById(`menu-${m}`).classList.toggle('menu_hidden'));
			}
		}



		this.element.querySelector(".menuspecial").innerHTML = this.marks[+this.value];
		this.do_trigger();

	}

	do_trigger(){
		if(this.callback) {
			this.callback(this.value_internal, this.name, this.variable);
		}
	}

	action(evt){
		if(document.activeElement.type === 'text') return;
		this.owner.toggle_state();
	}

	attach(html_el){
		this.element = html_el;
		if(this.value_internal) {
			this.element.classList.add(`${this.nature}_selected`);
		}
		this.element.addEventListener('click', this.action);
		this.element.owner = this;
	}

}


function variable_change(){
	document.activeElement.blur();
	this.owner.variable = this.value;
	this.owner.do_trigger();
}

function build_menu(name, parent, children, level){
	const has_submenus = Object.keys(children);
	const has_display = has_submenus.filter(c => (menus[c].type === 'dynamic' && active_menus.includes(c)) || menus[c].type === 'static');
	if(has_submenus.length && !has_display.length) return false;


	const menuitem = menus[name];



	const header = document.getElementById("menu_header_temp").cloneNode(true);
	header.setAttribute('id',`menu-${name}`);
	header.classList.remove("template");
	header.querySelector(".menulabel").innerHTML = menuitem.hasOwnProperty('asset') ? menuitem.asset : menuitem.name;

	if(menuitem.hasOwnProperty('key')){
		header.querySelector(".menukey").innerHTML = `(${menuitem.key_v})`;
	}else{
		header.querySelector(".menukey").classList.add('menu_hidden');
	}

	if(!has_submenus.length){
		header.querySelector(".menuspecial").classList.add('menu_hidden');
	}

	if(!has_submenus.length) header.classList.remove("highlited");
	container.appendChild(header);

	const item = new menu_item(name, menuitem.default);
	item.nature = has_submenus.length && has_display.length ? 'menu' : 'submenu';

	if(menuitem.hasOwnProperty('custom')){
		if(menuitem.custom === true){
			if(all_magics.hasOwnProperty(name)) item.callback = all_magics[name];
		}else{
			item.callback = all_magics[menuitem.custom];
		}
	}else{
		item.callback = all_magics.general;
	}

	if(menuitem.hasOwnProperty('is_variable')){
		header.classList.add('menu-item-var');
		header.querySelector(".menuspecial").classList.remove('menu_hidden');
		header.querySelector(".menuspecial").innerHTML = `(${menuitem.units})`;

		item.variable = menuitem.is_variable;

		const field_el = document.getElementById("variable_setter_temp").cloneNode(true);
		field_el.classList.remove("template");
		const field = field_el.querySelector(".var-text");
		field.value = menuitem.is_variable;
		field.addEventListener('change', variable_change);
		field.owner = item;

		header.querySelector(".menulabel").appendChild(field_el);

	}

	header.classList.add(`${item.nature}_default`);
	header.querySelector(".menulabel").style.paddingLeft = ((level-1)*6)+'px';
	item.container = container;
	item.submenus = has_display;


	if(!menuitem.hasOwnProperty('is_variable')) {
		item.attach(header);
		item.registerListener(function (val) {
			//console.log(`Someone changed the value of menu_item ${name}.value to ${val}`);
		});

	}
	menuitem.object = item;
	return menuitem;
}

function unpack_menus(dict, parent, lv, master){
	lv++;
	for (const key in dict) {
		if(menus.hasOwnProperty(key)){
			if((menus[key].type === 'dynamic' && active_menus.includes(key)) || menus[key].type === 'static'){
				const menu = build_menu(key, parent, dict[key], lv);
				if(menu) master[key] = menu;
			}
		}
		unpack_menus(dict[key], key, lv, master)
	}
	return master;
}

function get_menu_defaults(){
	return [a_menus, a_dpk];
}

function make_ui_layers_panel(target_element, magics, item_states, m_menus, m_dpk){
	menus = m_menus;
	dpk = m_dpk;
	container = target_element;
	all_magics = magics;
	active_menus = item_states;

	const pronounce_the_r = unpack_menus(dpk, 'root', 0, {});
	console.log(pronounce_the_r);

	return pronounce_the_r;
}

export { make_ui_layers_panel, menu_item, slider, get_menu_defaults, info_tree_view, fast_unpack_object }
