import * as THREE from 'three/build/three.module.js';
import {LineGeometry} from 'three/examples/jsm/lines/LineGeometry.js';
import {Line2} from 'three/examples/jsm/lines/Line2.js';
import {data_loader as fetchAll} from './data-loader.js';
import * as MATS from './materials.js';
import * as UTIL from './utilities.js';
import {teardown_particle} from "./teardown-functions";

const w = new THREE.Vector3();
const k = new THREE.Vector3();
const v = new THREE.Vector3();
const uz = new THREE.Vector3(0,0,1);

//https://stackoverflow.com/questions/63160304/how-to-make-three-js-shadermaterial-gradient-to-transpar

const color = new THREE.Color();


function in_out_to_poly_parts(c_shape){
	let exterior_points = [];
	let interiors = [];

	if (c_shape.hasOwnProperty('out')) {
		for (let p = 0; p < c_shape.out.length; p += 2) {
			exterior_points.push(new THREE.Vector2(c_shape.out[p]*1.0, c_shape.out[p + 1]*1.0));
		}
	}

	if (c_shape.hasOwnProperty('ins')) {
		for (let interior of c_shape.ins) {
			let interior_points = [];
			for (let p = 0; p < interior.length; p += 2) {
				interior_points.push(new THREE.Vector2(interior[p], interior[p + 1]));
			}
			const interior_shape = new THREE.Shape(interior_points);
			interiors.push(interior_shape);
		}
	}

	if (exterior_points.length) {
		const outline = new THREE.Shape(exterior_points);
		if (interiors.length) outline.holes = interiors;
		return outline;
	}else{
		return null;
	}
}

function make_arrow_vector_triangle(){
	const verts = Float32Array.from([-0.5,-1,0,0,1,0,0.5,-1,0]);
	const a_geometry = new THREE.BufferGeometry();
	a_geometry.setAttribute('position', new THREE.BufferAttribute(verts, 3));
	a_geometry.setIndex([2, 1, 0]);
	return new THREE.Mesh(a_geometry, MATS.mapWindVectorMaterial.clone());
}

const k_rand = (e) => (e/2)-(Math.random()*e);

class wind_particle extends THREE.Vector3 {
	constructor(id, loc, vars) {
		super();
		this.particle_id = id;
		if(loc === 'scatter') loc = [k_rand(vars.depth[0]), k_rand(vars.depth[1]), k_rand(vars.depth[2])];

		this.loc = new THREE.Vector2().fromArray([loc[0], loc[1]]);
		this.motor = new THREE.Vector2().fromArray([loc[0], loc[1]]);
		this.x = loc[0];
		this.y = loc[1];
		this.z = loc[2];
		this.ac = new THREE.Vector3(0, 0, 0);
		this.d = new THREE.Vector3();
		this.delta_p = 0;
		this.vars = vars;
		this.scale = vars.scale;

		this.flow = 0;
		this.frame = Math.random()*(2*Math.PI);
		this.lifespan = 2+(Math.random()*2.0);
	}

	reset_random(){
		this.set(k_rand(this.vars.depth[0]), k_rand(this.vars.depth[1]), k_rand(this.vars.depth[2]));
		this.ac.set(0, 0, 0);
		this.loc.set(0,0);
		this.delta_p = 0.0;
		this.frame = -Math.PI;
		this.flow = 0.0;
		this.d.copy(this);
	}

	move(){
		this.delta_p = w.subVectors(this.d, this).length();
		this.d.copy(this);

		this.ac.setX(this.ac.x+(this.loc.x*0.001));
		this.ac.setY(this.ac.y+(this.loc.y*0.001));
		//this.ac.add(this.initial.clone().multiplyScalar(0.1));
		this.add(this.ac.clone().multiplyScalar(0.01));

		this.ac.multiplyScalar(this.vars.particle_decay_factor);



		this.frame += (Math.PI / (this.vars.particle_refresh_rate * this.lifespan));
		if (this.frame >= Math.PI) {
			this.reset_random();
		}
		this.flow = (1 + Math.cos(this.frame)) / 2;

		// this.motor.lerp(this.loc, 0.001);
		// this.x += this.motor.x/50;
		// this.y += this.motor.y/50;
		if(Math.abs(this.x) > this.vars.depth[0]/2 || Math.abs(this.y) > this.vars.depth[1]/2) this.reset_random();
	}

}

class generic_label extends THREE.Mesh {
	constructor(w, h) {
		super();
		this.width = w;
		this.height = h;
		this.material = new THREE.MeshBasicMaterial({
			color: 0x00FF00,
			transparent: true,
			//blending: THREE.AdditiveBlending,
			depthWrite: false
		});//{color:0x000000}
		this.geometry = new THREE.PlaneBufferGeometry(this.width, this.height);
		//this.geometry.deleteAttribute('normal');
		//this.template = document.createElement('div');
		this.canvas = document.createElement('canvas');
		this.canvas.width = w;
		this.canvas.height = h;
		this.init();
	}

	init(){
		this.rotateX(Math.PI / -2);
		this.material.map = new THREE.CanvasTexture(this.canvas);
	}

	update(dm){
		const vertices = new Float32Array( [
			-dm[0], dm[1],  0,
			 dm[0], dm[1],  0,
			 -dm[0], -dm[1],  0,
			 dm[0], -dm[1],  0,
		] );
		this.geometry.setAttribute( 'position', new THREE.BufferAttribute( vertices, 3 ) );
	}

	set_text(text_lines, size=100){
		const ctx = this.canvas.getContext('2d');
		ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		ctx.font = '48px heavy_data';
		const chk = text_lines.map((rv, i) => {
			let c = ctx.measureText(rv);
			return [c.fontBoundingBoxAscent, c.fontBoundingBoxDescent, c.width];
		});

		let max_width = Math.max.apply(Math, chk.map(rv => rv[2]));
		let line_height = (chk[0][0]);//+chk[0][1]);
		let max_height = line_height*text_lines.length;

		// this.canvas.width = max_width;
		// this.canvas.height = max_height;

		//#// U G H

		const context = this.canvas.getContext('2d');
		// context.fillStyle = '#000000';
		// context.fillRect(0, 0, this.canvas.width, this.canvas.height);
		context.fillStyle = '#FFFFFF';
		context.font = '48px heavy_data';

		let textpos = (this.width/2)-(max_width/2);

		text_lines.forEach((rv, i) =>{
			context.fillText(rv, textpos, ((i+1)*line_height)-chk[0][1]);
		})

		this.update([this.width/size, this.height/size]);
		//this.material.map.offset.set(0.0, 0.5);
		//(this.height/max_height)
		// this.material.map.offset.x = 0.0;
		// this.material.map.repeat.x = max_width/this.width;

		//this.material.map.repeat.set(max_width/this.width, 0.5);// this.height/max_height);//, 1.0);//max_width/this.width, 1.0);
		this.material.map.needsUpdate = true;
		//this.material.needsUpdate = true;
		//return true;
	}

}

class location_poi {
	constructor (location_as_json){
		this.data = location_as_json;
		this.object_id = null
		this.position = null;
		this.guide_id = null;
		this.guide_position = null;
		this.init();
	}

	init(){
		//this.data.scale = 4-this.data.scale;
	}

	get_mesh(){
		let sca = (5 - this.data.scale) * 0.01;
		const geometry = new THREE.CircleGeometry(sca, 24);
		const circle = new THREE.Mesh(geometry, MATS.mapTilePlacesMaterial);
		circle.userData.place = this;
		circle.userData.level = this.data.scale;
		circle.userData.scans = true;
		circle.translateX(this.data.loc[0]);
		circle.translateY(this.data.loc[1]);
		circle.translateZ(0.005);

		this.object_id = circle.id;
		this.position = new THREE.Vector3(this.data.loc[0],this.data.loc[1],0.0);
		//circle.translateZ(0.006);
		return circle;
	}

	get_svg(){

	}

	name_short(){
		return [this.data.name, this.data.locale, '('+this.data.country+')', this.data.scale, this.data.population];
	}

}

class data_point_wudi {
	constructor (data_as_json, data_spec){
		this.data_spec = data_spec;
		this.data = data_as_json;
		this.A = new THREE.Vector3(this.data.a[0],this.data.a[1],0);
		this.B = new THREE.Vector3(this.data.b[0],this.data.b[1],0);
		this.M = new THREE.Vector3(this.data.m[0],this.data.m[1],0);
		this.U = null;
		this.D = null;
		this.index = this.data.i;
		this.group_id = null;
		this.group = new THREE.Group();
		this.guide_id = null;
		this.guide_position = null;
		this.def_build_objects();		
		this.update_mesh([this.data.v['U'],this.data.v['D']]);
	}

	reset_state(){
		this.group.children.forEach(c => c.material.opacity = 0.5);
		return true;
	}

	hover_state(){
		this.group.children.forEach(c => c.material.opacity = 1.0);
		return true;
	}
	
	def_build_objects(){
		this.group.userData.data_point = this;
		this.group.userData.level = 1;
		this.group.userData.name = 'wudi_instance';
		
		const plonk = [[0,0x0000ff,1,'U'], [1,0xff0000,-1,'D']];
		for(let m in plonk){
			const i = plonk[m];
			const the_UPW_material = MATS.mapWudiDataMaterial.clone();
			the_UPW_material.color.setHex(i[1]);
			const points = [this.A, this.A, this.B, this.B];
			
			const bar_geometry = new THREE.BufferGeometry().setFromPoints(points);
			bar_geometry.setIndex([0, 1, 2, 2, 3, 0]);
			bar_geometry.computeVertexNormals();
			bar_geometry.computeBoundingBox();
			const bar = new THREE.Mesh(bar_geometry, the_UPW_material);
			bar.userData.kind = 'bar'+i[3];
			
			const the_UPW_line_material = MATS.mapWudiDataLineMaterial.clone();
			the_UPW_line_material.color.setHex(i[1]);
			const line_geom = new THREE.BufferGeometry().setFromPoints([this.A, this.B]);
			const line_spes = new THREE.Line(line_geom, the_UPW_line_material);
			line_spes.userData.kind = 'line'+i[3];
			
			this[i[3]] = {'d':i[2], 'v':this.data.v[i[3]]};
			this.group.add(bar);
			this.group.add(line_spes);
		}
	}
	
	update_mesh(wudi_tuple){
		//console.log(this.data);
		this.data.v['U'] = wudi_tuple[0];
		this.data.v['D'] = wudi_tuple[1];
		
		const plonk = [[0, 0x0000ff , 1 , 'U'], [1, 0xff0000, -1,'D']];
		
		for(let c=0; c<plonk.length; c++){
			const i = plonk[c];
			const ost = UTIL.normalize_val(wudi_tuple[c], 0.01, this.data_spec.limits[plonk[c][3]]);
			
			for(let pmi of this.group.children){
				if(pmi.userData.kind.indexOf(plonk[c][3]) !== -1){
					if(pmi.userData.kind.indexOf('line') !== -1){
						const A2 = this.A.clone().setZ(0);
						const B2 = this.A.clone().setZ(ost*plonk[c][2]);
						const line_geom = new THREE.BufferGeometry().setFromPoints([A2,B2]);
						pmi.geometry = line_geom;
						pmi.geometry.needsUpdate = true;
					}
					if(pmi.userData.kind.indexOf('bar') !== -1){
						const A2 = this.A.clone().setZ(ost*plonk[c][2]);
						const B2 = this.B.clone().setZ(ost*plonk[c][2]);
						const points = [this.A, A2, B2, this.B];
						const bar_geom = new THREE.BufferGeometry().setFromPoints(points);
						bar_geom.setIndex([0, 1, 2, 2, 3, 0]);
						bar_geom.computeVertexNormals();
						bar_geom.computeBoundingBox();
						pmi.geometry = bar_geom;
						pmi.geometry.needsUpdate = true;
					}	
				}
			}
			this[i[3]] = {'d':ost*i[2], 'v':this.data.v[i[3]]};
		}
	}

	get_mesh(){
		return this.group;
				//
		// this.group.userData.data_point = this;
		// this.group.userData.level = 1;
		// this.group.userData.name = 'wudi_instance';
		//
		// const geometry = new THREE.CircleGeometry(0.01, 24);
		// geometry.computeBoundingSphere();
		// geometry.computeBoundingBox();
		//
		// const circle = new THREE.Mesh(geometry, MATS.mapWudiDataMaterial);
		//
		// circle.userData.level = 1;//this.data.lv;//+1;
		// circle.userData.scans = true;
		// circle.userData.name = 'marker';
		//
		// if(this.data.m.length) {
		// 	circle.translateX(this.data.m[0]);
		// 	circle.translateY(this.data.m[1]);
		//
		// 	const plonk = [[0,0x0000ff,1,'U'],[1,0xff0000,-1,'D']];
		//
		// 	for(let m in plonk){
		// 		const i = plonk[m];
		// 		const the_UPW_material = MATS.mapWudiDataMaterial.clone();
		// 		the_UPW_material.color.setHex(i[1]);
		//
		// 		const ost = UTIL.normalize_val(this.data.v[i[3]], 0.01, this.data_spec.limits[i[3]]);
		// 		const A2 = this.A.clone().setZ(ost*i[2]);
		// 		const B2 = this.B.clone().setZ(ost*i[2]);
		//
		// 		const points = [this.A, A2, B2, this.B];
		//
		// 		const bar_geometry = new THREE.BufferGeometry().setFromPoints(points);
		// 		bar_geometry.setIndex([0, 1, 2, 2, 3, 0]);
		// 		bar_geometry.computeVertexNormals();
		// 		bar_geometry.computeBoundingBox();
		//
		// 		const the_UPW_line_material = MATS.mapWudiDataLineMaterial.clone();
		// 		the_UPW_line_material.color.setHex(i[1]);
		// 		const line_geom = new THREE.BufferGeometry().setFromPoints([this.A, A2]);
		// 		const line_spes = new THREE.Line(line_geom, the_UPW_line_material);
		//
		//
		// 		const bar = new THREE.Mesh(bar_geometry, the_UPW_material);
		// 		//bar.userData.level = 2;//this.data.lv;//+1;
		// 		this.group.add(bar);
		// 		this.group.add(line_spes);
		// 		this[i[3]] = {'d':ost*i[2], 'v':this.data.v[i[3]]};
		// 		//bars.add(bar);
		// 	}
		//
		// 	return this.group;
		// }else{
		// 	return false;
		// }
	}
}

class sector extends THREE.Group {
	constructor(name, loc, number, vertices, data_keys=null, vars_context, load_trace) {
		super();

		this.vertices = vertices;
		this.name = name;
		this.loc = loc;

		this.center = new THREE.Vector3();
		this.zoom_level = 0;
		this.tile_number = number;
		this.loaded = {};
		this.load_lock = false;
		this.keywords = null;
		this.plane = null;
		this.intersects_shapes = [];
		this.data_keys = data_keys;
		delete this.data_keys.id;

		this.data_info = vars_context.map.data.map_spec.includes_attributes;

		for(let c in this.data_keys){  //#like the telephone here, the dialup.
			this[c] = new THREE.Group();
			this[c].matrixAutoUpdate = false;

			this[c].name = c;
			let range = 1;
			if(this.data_keys[c].hasOwnProperty('spc')){
				this.data_keys[c].memory = [...Array(this.data_keys[c].lvmax)].map(e => Array(this.data_keys[c].spc.indx).fill(0));
				this.data_keys[c].grid_resolutions = this.data_info[c].resolutions;
				range = this.data_keys[c].spc.indx;
			}

			this.data_keys[c].levels = [...Array(this.data_keys[c].lvmax)].map(e => Array(range).fill(1));
			//console.log(c, this.data_keys[c].levels);
			this.data_keys[c].frame = 0;
			//and so level -> time [a,b] indices.
		}

		if(this.data_keys.hasOwnProperty('wind')) {
			this.data_keys.wind.resolutions = [...Array(this.data_keys.wind.lvmax)];
			this.data_keys.wind.flat_data = [...Array(this.data_keys.wind.lvmax)];
		}

		this.wind_resolution = null;
		this.wind_any_loaded = false;

		this.base_url = vars_context.base_url;
		this.map_deg = vars_context.map.map_deg;


		this.time_data = vars_context.map.time_data;
		//console.log(this.name, this.data_keys);
		this.show_load = load_trace;
		this.callback = vars_context.sector_load_callback;
		this.init();
	}

	// #//SRC
	src(item, level){
		if(this.data_keys[item].hasOwnProperty('spc')){
			const frame = this.time_data[item].frame;
			return this.base_url + 'Sector-' + this.tile_number + '/' + item + '-' + level + '-' + frame + '.json';
		}else {
			return this.base_url + 'Sector-' + this.tile_number + '/' + item + '-' + level + '.json';
		}
	}

	init() {
		const material = MATS.mapMeshMaterial.clone();
		const geometry = new THREE.BufferGeometry().setFromPoints(this.vertices);
		geometry.setIndex([0, 1, 2, 2, 3, 0]);
		geometry.computeVertexNormals();
		geometry.computeBoundingBox();
		geometry.boundingBox.getCenter(this.center);
		this.plane = new THREE.Mesh(geometry, material);

		const rand_label = new generic_label(400,56);
		rand_label.set_text([this.name], 1500);
		rand_label.position.copy(this.center);
		rand_label.rotateX(Math.PI / 2);
		this.plane.add(rand_label);


		this.add(this.plane);






		for(let c in this.data_keys){
			//console.log(this[c]);
			this.add(this[c]);
		}
		//#console.log(this.data_keys);
	}

	load_data_layer(){

	}


	request_tile(load_queue, zoom_level, stage) {
		if(load_queue.length === 0) return;
		this.load_lock = true;
		fetchAll(load_queue, this.show_load).then(result => {
			this.load_tile(result, zoom_level);
		});
	}


	load_tile(data, zoom_level) {
		Object.keys(this.data_keys).forEach(ek => {
			const k = this.data_keys[ek];
			const kzl = Math.min(zoom_level-1, k.levels.length-1);
			if (k.levels[kzl][k.frame] === 1 && this[ek].visible) k.levels[kzl][k.frame] = 2;
		});

		//#//these are meant to update over time
		if (data.hasOwnProperty('wind')) {
			//const kzl = original_q.filter(k=>k[0] === 'wind')[0][2];
			const kzl = Math.min(zoom_level-1, this.data_keys.wind.levels.length-1);
			if(this.data_keys.wind['lv'][kzl] === 1){
				k.copy(this.vertices[0]);
				const data_width = data.wind[0].length;
				const size = Math.pow(data_width, 2);
				const d = (1 / data_width)*this.map_deg;
				this.data_keys.wind.resolutions[kzl] = data_width;
				this.data_keys.wind.flat_data[kzl] = [];

				for (let c = 0; c < size; c++) {
					const x = c % data_width;
					const y = Math.floor(c / data_width);

					w.set(k.x + (x * (d)) - (0), k.y - (y * (d)) + (0), 0.0);
					v.set(d/2, d/-2, 0.01).add(w);

					const data_point = make_arrow_vector_triangle();
					data_point.material.opacity = 0.5;
					data_point.position.copy(v);
					data_point.userData.level = kzl+1;
					this.wind.add(data_point);
				}
				this.wind_any_loaded = true;
				this.data_keys.wind['lv'][kzl] = 2;
			}

			this.data_keys.wind.memory[kzl][this.data_keys.wind.frame] = data.wind;
			//this.time_data_updater('wind', kzl, this.data_keys.wind.frame);

		}
		if (data.hasOwnProperty('sst')) {
			//const kzl = original_q.filter(k=>k[0] === 'sst')[0][2];
			const kzl = Math.min(zoom_level-1, this.data_keys.sst.levels.length-1);
			if(this.data_keys.sst['lv'][kzl] === 1) {
				k.copy(this.vertices[0]);
				let data_width = data.sst[0].length;
				let size = Math.pow(data_width, 2);
				let vertices = [];
				let d = (1 / data_width) * this.map_deg;

				for (let c = 0; c < size; c++) {
					const x = c % data_width;
					const y = Math.floor(c / data_width);
					w.set(k.x + (x * (d)) - (0), k.y - (y * (d)) + (0), 0.0);
					v.set(d / 2, d / -2, -0.005).add(w);
					vertices.push(w.clone());
					const geometry = new THREE.PlaneBufferGeometry(d, d);
					geometry.deleteAttribute('normal');
					geometry.deleteAttribute('uv');
					const data_point = new THREE.Mesh(geometry, MATS.mapTempMaterial.clone());
					data_point.position.copy(v);
					data_point.userData.level = kzl + 1;
					this.sst.add(data_point);
				}

				this.data_keys.sst['lv'][kzl] = 2;
			}
			// let pointsGeometry = new THREE.BufferGeometry().setFromPoints(vertices);
			// //#pointsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
			// const p_sst = new THREE.Points(pointsGeometry, MATS.mapTileDepthsMaterial);
			// p_sst.userData.level = zoom_level;
			// this.sst.add(p_sst);
			this.data_keys.sst.memory[kzl][this.data_keys.sst.frame] = data.sst;
			//this.time_data_updater('sst', kzl, this.data_keys.sst.frame);

		}
		//#//these are NOT meant to update over time
		if (data.hasOwnProperty('lines')) {
			const linesMaterial = MATS.mapTileLinesMaterial.clone();
			//stat.push('(' + data.lines.length + ') lines');
			for (let shape of data.lines) {
				//console.log("lineshape", shape);
				 //[0];//[1];
				//if(shape.geom.length > 1) console.log(shape.geom);

				for (let geom of shape.geom) {
					const points = geom; //shape.geom;
				//if(points) {

					let vertices = [], colors = [];
					color.setHex(0x00FF22);

					for (let p = 0; p < points.length; p += 2) {
						vertices.push(points[p], points[p + 1], 0.001);
						colors.push(color.r, color.g, color.b)
					}

					const geometry = new LineGeometry();
					geometry.setPositions(vertices);
					geometry.setColors(colors);
					
					const shape_line = new Line2(geometry, linesMaterial);
					shape_line.computeLineDistances();
					shape_line.userData.line_shape = shape.shape;//[2][0];
					shape_line.userData.level = zoom_level;

					if (!this.intersects_shapes.includes(shape.shape)) this.intersects_shapes.push(shape.shape);
					this.lines.add(shape_line);
				}
			}
		}
		if (data.hasOwnProperty('fills')) {
			for (let shape of data['fills']) {
				//in_out_to_poly_parts assumes poly ins and outs arrays as per python preparations
				const et = in_out_to_poly_parts(shape);
				if(et) {

					const geometry = new THREE.ShapeBufferGeometry(et);
					const mesh = new THREE.Mesh(geometry, MATS.mapTileFillsMaterial);
					//mesh.translateZ(0.0018);
					mesh.userData.level = zoom_level;
					this.fills.add(mesh);
				}
			}
		}
		if (data.hasOwnProperty('protected_regions')) {
			for (let area of data['protected_regions']) {
				//in_out_to_poly_parts assumes poly ins and outs arrays as per python preparations
				//console.log(area);

				for(let poly of area.geometry){

					const et = in_out_to_poly_parts(poly);

					if(et) {

						const geometry = new THREE.ShapeBufferGeometry(et);
						const mesh = new THREE.Mesh(geometry, MATS.mapTileRegionsMaterial);
						//mesh.translateZ(0.5);
						mesh.userData.scans = true;
						mesh.userData.area = area;
						mesh.userData.level = 5-area.scale;//zoom_level;
						this.protected_regions.add(mesh);
					}
				}
			}
		}
		if (data.hasOwnProperty('depth_points')) {
			k.copy(this.vertices[0]);//vars.map.vertices[this.tile_number]);//.clone();
			let data_width = data.depth_points[0].length;

			let size = Math.pow(data_width, 2);
			let vertices = [];
			let d = (1 / data_width)*this.map_deg;
			let colors = new Float32Array(size * 3);

			const water = [0.2, 0.8];
			//const land = [0.6,0.2];

			for (let c = 0; c < size; c++) {
				const x = c % data_width;
				const y = Math.floor(c / data_width);
				const z = data.depth_points[y][x] === null ? 0.0 : data.depth_points[y][x] / (UTIL.km_deg*100);
				//console.log(z);

				if (Math.sign(z) === -1) {///< 0.0) {
					w.set(k.x + (x * d), k.y - (y * d), z);//.multiplyScalar(vars.map.map_deg);
					vertices.push(w.clone());
				}

				let cd = c * 3;
				colors[cd] = 0.0;
				colors[cd + 1] = water[0];// z < -0.0 ? water[0]:land[0];
				colors[cd + 2] = water[1];//z < -0.0 ? water[1]:land[1];
			}

			let pointsGeometry = new THREE.BufferGeometry().setFromPoints(vertices);
			pointsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
			const p_depth_points = new THREE.Points(pointsGeometry, MATS.mapTileDepthsMaterial);
			p_depth_points.userData.level = zoom_level;
			this.depth_points.add(p_depth_points);

		}
		if (data.hasOwnProperty('urban')){
			//#console.log(this.name, data.urban.areas);
			for (let shape of data.urban) {

				if (shape.hasOwnProperty('poly')) {
					for (let i = 0; i < shape.poly.length; i ++) {
						let exterior_points = []
						for (let p = 0; p < shape.poly[i].length; p += 2) {
							exterior_points.push(new THREE.Vector2(shape.poly[i][p], shape.poly[i][p + 1]));
						}

						const outline = new THREE.Shape(exterior_points);
						const geometry = new THREE.ShapeBufferGeometry(outline);
						const mesh = new THREE.Mesh(geometry, MATS.mapTileUrbanAreasMaterial);
						//mesh.translateZ(0.002);
						mesh.userData.urban = {"shape":shape, "poly":i};
						mesh.userData.scans = true;
						mesh.userData.level = shape.scale;
						this.urban.add(mesh);
					}
				}


			}
		}
		if (data.hasOwnProperty('places')) {
			for (let p of data.places) {
				const place = new location_poi(p);
				this.places.add(place.get_mesh());
			}
		}
		if (data.hasOwnProperty('contours')) {
			const linesMaterial = MATS.mapContoursMaterial.clone();
			//stat.push('(' + data.lines.length + ') lines');
			for (let shape of data.contours) {

				const paths = shape['path'];
				const path_depth = shape['m'] / (UTIL.km_deg*100);
				for (let path of paths) {

					//console.log("lineshape", shape);
					const points = path;
					let vertices = [], colors = [];
					color.setHex(0xFFFFFF);

					for (let p = 0; p < points.length; p += 2) {
						vertices.push(new THREE.Vector3(points[p], points[p + 1], -path_depth));
						colors.push(color.r, color.g, color.b)
					}

					const geometry = new THREE.BufferGeometry().setFromPoints(vertices);

					// const geometry = new LineGeometry();
					// geometry.setPositions(vertices);
					// geometry.setColors(colors);

					const shape_line = new THREE.Line(geometry, linesMaterial);
					// shape_line.computeLineDistances();
					// shape_line.userData.line_shape = shape[2][0];
					shape_line.userData.level = zoom_level;
					//
					// if (!this.intersects_shapes.includes(shape[2])) this.intersects_shapes.push(shape[2]);
					this.contours.add(shape_line);
				}
			}
		}
		if (data.hasOwnProperty('wudi')) {
			for (let p of data.wudi) {
				const data_point = new data_point_wudi(p, this.data_info.wudi);
				const pieces = data_point.get_mesh();
				if(pieces) {
					this.wudi.add(pieces);
				}
			}
		}


		this.load_lock = false;
		this.callback(this);
		this.update();
		//Object.keys(this.data_keys).map(k => this.draw_sector(k));
	}

	// #// @ wind-specific
	get_wind_resolution(){
		//if(!this.wind_resolution) return null;
		const zl = this.zoom_level > this.data_keys.wind.lvmax ? this.data_keys.wind.lvmax-1: this.zoom_level-1;
		this.wind_resolution = [zl, this.data_keys.wind.resolutions[zl]];
	}

	// #// @ wind-specific
	get_wind_at_point(x,y){
		if(!this.wind_resolution || !this.wind_any_loaded) return null;
		const s = [Math.floor(x*this.wind_resolution[1]), Math.floor(y*this.wind_resolution[1])];
		const i = (s[1]*this.wind_resolution[1])+s[0];
		const reso = this.data_keys.wind.flat_data[this.wind_resolution[0]];

		if(reso && i < reso.length){
			return this.data_keys.wind.flat_data[this.wind_resolution[0]][i];
		}else{
			return null;
		}
	}


	get_max_level(key){
		const pre_k = this.data_keys[key].levels.map(lv => lv[this.data_keys[key].frame]);
		return pre_k.slice(0,this.zoom_level).lastIndexOf(2)+1;
	}

	draw_sector(ky) {
		const a = this.get_max_level(ky);
		if(this.data_keys[ky].hasOwnProperty('static')){
			this[ky].children.forEach(res => res.visible = (res.userData.level <= this.zoom_level));
		}else{
			if(a) this[ky].children.forEach(res => res.visible = (res.userData.level === a));
		}
	}

	update() {
		let zl = this.zoom_level - 1;
		//if (this.load_lock === false) {
			let p = [];
			Object.keys(this.data_keys).forEach((ek) => {
				const k = this.data_keys[ek];
				const zla = Math.min(zl, k.levels.length - 1);
				if (k.levels[zla][k.frame] === 1 && this[ek].visible) p.push([ek, this.src(ek, zla), zla]); // && this[ek].visible
			});
			//#//I would put an async call here if I could.
			if (p.length) this.request_tile(p, this.zoom_level, null);
		//}
		// if (this.load_lock === false) {
		// 	let p = [];
		// 	Object.keys(this.data_keys).forEach(ek => {
		// 		let k = this.data_keys[ek];
		// 		if (ek === 'wind' || ek ==='sst') k.frame = this.time_data[ek].frame;
		// 		if (k.levels.length > zl) {
		// 			if (k.levels[zl][k.frame] === 1) p.push([ek, this.src(ek, zl), zl]);
		// 		} else {
		// 			if (ek === 'wind' || ek ==='sst') {
		// 				let zla = Math.min(zl,k.levels.length-1);
		// 				if (k.levels[zla][k.frame] === 1) p.push([ek, this.src(ek, zla), zla]);
		// 			}
		// 		}
		// 	});
		// 	//console.log(p);
		// 	if (p.length) this.request_tile(p, this.zoom_level, null);
		// }


			// const p = Object.keys(this.data_keys)
			// 	//.filter((k) => this.data_keys[k]['lv'][zl] === 1 && !this.data_keys[k].hasOwnProperty('spc')) //not yet loaded static
			// 	//.filter((k) => this.data_keys[k]['lv'][zl] === 1) //not yet loaded static
			// 	.filter((k) => this.data_keys[k].levels[zl][this.data_keys[k].frame] === 1) //not yet loaded static
			// 	.map((k) => [k, this.src(k, zl)]); //get target url yet loaded static
			// //console.log(p);
			// if(p.length) this.request_tile(p, this.zoom_level, null);
		//}
		//|| this.data_keys[k].memory[zl][this.time_data[k].frame] === 0

		// Object.keys(this.data_keys).filter(k => this.data_keys[k].hasOwnProperty('spc'))
		// 	.map(r => console.log(r));
		// Object.keys(this.data_keys).forEach(k => {
		// 	if(this.data_keys[k].hasOwnProperty('spc')){
		// 		console.log("generic update", this.name, k);
		// 		//const frame = this.time_data[item].frame;
		// 		//console.log(this.time_data[k].frame);
		// 		this.update_frame(k, this.time_data[k].frame);
		// 	}else{
		// 		this.draw_sector(k);
		// 	}
		//
		// });



		Object.keys(this.data_keys).map(k => {
			if(this.data_keys[k].hasOwnProperty('spc') && this[k].visible){
				//#//this needs to wait for data;
				const kzl = Math.min(zl,this.data_keys[k].levels.length-1);
				this.time_data_updater(k, kzl, this.data_keys[k].frame);
			}
			if (this.load_lock === false && this[k].visible) this.draw_sector(k);
		});

		if (this.data_keys.hasOwnProperty('wind')) this.get_wind_resolution();
	}


	time_data_updater(data_key, key_level, key_frame, is_first_load=null){
		if(data_key === 'sst') {
			const tiles = this.sst.children.filter((k) => k.userData.level === key_level + 1);
			const data = this.data_keys.sst.memory[key_level][key_frame];
			const value_limits = this.data_info.sst.limits;
			let data_width = data.length;
			let size = Math.pow(data_width, 2);
			for (let c = 0; c < size; c++) {
				const t = tiles[c];
				const x = c % data_width;
				const y = Math.floor(c / data_width);
				const z = data[y][x];// #//POWER MOVE
				const cn = UTIL.normalize_val(z, value_limits.min, value_limits.max);
				t.material.color.setHSL(1 - cn, 1.0, 0.2);
			}
		}
		//// console.log(data_key);

		if(data_key === 'wind') {
			const tiles = this.wind.children.filter((k) => k.userData.level === key_level + 1);
			const data = this.data_keys.wind.memory[key_level][key_frame];
			let data_width = data.length;
			let size = Math.pow(data_width, 2);
			this.data_keys.wind.flat_data[key_level] = [];

			for (let c = 0; c < size; c++) {
				const t = tiles[c];
				t.rotation.set(0.0, 0.0, 0.0);
				const x = c % data_width;
				const y = Math.floor(c / data_width);
				const z = data[y][x];// #//POWER MOVE
				let cpv = z.split(' ');
				const U = parseFloat(cpv[0]);
				const V = parseFloat(cpv[1]);

				const WDIR = 270 - (Math.atan2(-V, U) * (180 / Math.PI));
				const WLEN = Math.sqrt(Math.pow(U, 2) + Math.pow(V, 2));
				t.scale.set(0.050, 0.025 * WLEN, 0.050);
				t.rotateZ(WDIR * (Math.PI / 180));

				v.set(0,WLEN,0).applyAxisAngle(uz, WDIR*(Math.PI/180));
				this.data_keys.wind.flat_data[key_level].push(v.clone());
			}
		}
	}


	update_frame(){///data_key, af){
		//return;
		//if(!this.hasOwnProperty(data_key)) return;
		//this.data_keys[data_key].frame = af;

		this.update();
		//
		// //const indexes = this.data_keys[data_key].spc.indx;
		// const key_frame = af;// % indexes;
		// let level = this.zoom_level-1;
		//
		// if(level !== -1){
		// 	if( this.zoom_level >= this.data_keys[data_key].lvmax ) level = this.data_keys[data_key].lvmax - 1;
		// 	const src = this.base_url + 'Sector-' + this.tile_number + '/' + data_key + '-' + level + '-' + key_frame + '.json';
		// 	if(this.data_keys[data_key].memory[level][key_frame] === 0){
		// 		fetchAll([[data_key, src]], this.show_load).then(result => {
		// 			this.data_keys[data_key].memory[level][key_frame] = result[data_key];
		//
		// 			//if(this.data_keys[k]['lv'][level] === 1
		//
		// 			this.time_data_updater(data_key, level, key_frame);
		// 			//this.data_keys[data_key]['lv'][level] = 2;
		// 		});
		// 	}else{
		// 		this.time_data_updater(data_key, level, key_frame);
		// 	}
		// }

		//this[data_key].children.forEach(res => res.visible = (res.userData.level === level));

	}


	update_data(key_flag_array){
		return false;
	}
}

class mini_toggle {
	constructor(name, context, callback, initial = false) {
		this.conditions = ['off', 'on'];
		this.name = name;
		this.state = initial;
		this.prev_state = !initial;
		this.toggle = initial;
		this.obj = {};
		this.obj[name] = this.toggle;
		this.context = context;
		this.magic = callback;

		//#this.set(initial);
	}

	override(value) {
		this.toggle = !this.toggle;
		this.obj[this.name] = value;
		this.context[this.name] = value;
		this.prev_state = value;
		this.magic(this.obj);
	}

	set(value) {
		this.state = value;
		if (this.state !== this.prev_state) {
			if (value) {
				this.toggle = !this.toggle;
				this.context[this.name] = this.toggle;
				this.obj[this.name] = this.toggle;
				this.magic(this.obj);
			}
			this.prev_state = value;
		}
	}

	value() {
		return this.toggle;
	}
}


function make_particle_cloud(parent, vars){

	//width_vector.set(depth, depth, depth);

	let particles = [];

	const geometry = new THREE.SphereBufferGeometry( 0.1, 16, 8 );
	geometry.deleteAttribute('uv');
	geometry.deleteAttribute('normal');

	const material = new THREE.MeshBasicMaterial( {
		color: 0xFFFFFF,
		side: THREE.FrontSide,
		transparent: true,
		blending: THREE.AdditiveBlending,
		depthWrite: false,
	} );
	//const instance = new THREE.Mesh( geometry, material );

	const mesh = new THREE.InstancedMesh( geometry, material, vars.particle_count );

	parent.add(mesh);

	for(let c = 0; c < vars.particle_count; c++){
		particles.push(new wind_particle(c, 'scatter', vars));
	}


	return particles;
}


export { sector, mini_toggle, generic_label, wind_particle, make_particle_cloud };





