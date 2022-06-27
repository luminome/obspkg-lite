import * as THREE from "three";
import {vars} from "./vars";

let rip;
let depth;
let tgl = [-1,1];
let particle_count = 12000;//12000;

let v = new THREE.Vector3();
let w = new THREE.Vector3();
let width_vector = new THREE.Vector3();

const normalize_val = (val, mi, ma) => (val - mi) / (ma - mi);
const k_rand = (e) => (e/2)-(Math.random()*e);

class teardown_particle extends THREE.Vector3{
	constructor(id, loc, vars) {
		super();
		this.particle_id = id;
		if(loc === 'scatter') loc = [k_rand(depth*2), k_rand(depth*2), k_rand(depth*2)];

		this.loc = new THREE.Vector3().fromArray(loc);
		this.x = loc[0];
		this.y = loc[1];
		this.z = loc[2];

		this.initial = new THREE.Vector3(0,0,0);
		this.entropy = new THREE.Vector3();//k_rand(1), k_rand(1), k_rand(1)).multiplyScalar(0.0005);
		// this.dir = new THREE.Vector3();
		// this.acce = new THREE.Vector3();
		// this.velo = new THREE.Vector3();
		this.flow = 0;
		this.frame = Math.random()*(2*Math.PI);
		this.lifespan = 2+(Math.random()*2.0);
		this.vars = vars;
		this.refresh = 10+Math.round(Math.random()*40.0);


		this.d = new THREE.Vector3();
		this.vd = 0;
		this.vl = new THREE.Vector3();
		this.del_pos = new THREE.Vector3();
		this.ac = new THREE.Vector3();
		this.delta_p = 0;
		this.reset_entropy();
	}

	reset_random(){
		this.set(
			k_rand(2*this.vars.cell_size),
			k_rand(2*this.vars.cell_size),
			k_rand(2*this.vars.cell_size)
		);
		this.ac.set(0, 0, 0);
		this.delta_p = 0.0;
		this.reset_entropy();
	}

	reset_entropy(){
		this.entropy.set(
			k_rand(this.vars.particle_entropy),
			k_rand(this.vars.particle_entropy),
			k_rand(this.vars.particle_entropy)
		);
	}

	move(){
		this.d.copy(this);
		this.ac.add(this.initial.clone().multiplyScalar(this.vars.particle_inheritance));
		this.add(this.ac.clone().multiplyScalar(this.vars.particle_rate_factor/1000.0));

		this.delta_p = w.subVectors(this.d, this).length();

		if(Math.abs(this.x) > depth || Math.abs(this.y) > depth || Math.abs(this.z) > depth ){
			this.reset_random();
		}

		this.ac.multiplyScalar(this.vars.particle_decay_factor);

		if(!this.vars.three_d){
			this.setY(-0.75);
		}

		this.frame += (Math.PI / (this.vars.particle_refresh_rate * this.lifespan));
		if (this.frame >= Math.PI) {
			this.reset_random();
			this.lifespan = 2+(Math.random()*2.0);
			this.frame = -Math.PI;
		}
		this.flow = (1 + Math.cos(this.frame)) / 2;

	}

	// #//BASICALLY DESTROYED EVERYTHING BUT THAT'S OKAY.
	swing(rv, t){
		//v.set(this.x, this.y, this.z);
		w.subVectors(this.initial, this);//, v);

		let t_delta = t*10;//*10;
		this.d.lerp(w, 0.1);//dat.D_ATTEN);///subVectors(v,this.pos);
		let m = this.d.length();

		this.delta_p = this.del_pos.distanceTo(this);

		this.vd =  this.delta_p / t_delta;
		let r = 1 - (this.vd * t_delta) / m;
		this.ac.copy(this.d).normalize().multiplyScalar(0.01);//dat.SPED);
		if (r>0) this.vl.add(this.ac).multiplyScalar(r);//.multiplyScalar(r);
		this.del_pos.set(this.x,this.y,this.z);//.clone());
		this.add(this.vl);
	}



	idle(sel=null){
		if(this.vars.particle_windy_mode) {
			this.frame += (Math.PI / (this.vars.particle_refresh_rate * this.lifespan));
			if (this.frame >= Math.PI) {
				this.reset_random();
				this.frame = -Math.PI;
			}
			this.flow = (1 + Math.cos(this.frame)) / 2;
		}

		if(Math.abs(this.x) > depth || Math.abs(this.y) > depth || Math.abs(this.z) > depth ){
			//this.initial.copy(this);
			// this.vl.set(0, 0, 0);
			// this.delta_p = 0.0;
			this.reset_random();
			// this.d.copy(this);
			// this.del_pos.copy(this);
			// this.initial.copy(this);
		}
		// this.acce.addVectors(this.initial, this.entropy);
		// this.velo.add(this.acce.multiplyScalar(0.1));
		// //accel = initial
		// //v += accel*creep
		// //this += v.
		// this.velo.multiplyScalar(this.vars.particle_decay_factor);
		// //
		// v.set(this.x,this.y,this.z);
		//
		// this.add(this.velo);//.normalize());
		//
		// this.dir.subVectors(v,this);


		// }else if(Math.abs(this.x) >= depth || Math.abs(this.y) >= depth || Math.abs(this.z) >= depth ){
		// 	//this.reset_entropy();
		// 	//this.entropy.set(k_rand(0.05), k_rand(0.05), k_rand(0.05)).multiplyScalar(this.vars.particle_entropy);
		// 	if(this.vars.particle_randomize){
		// 		this.reset_random();
		// 		//this.multiplyScalar(0.975);
		// 		this.reset_entropy();
		// 	}else{
		// 		if (Math.abs(this.x) >= depth ) this.x*=-0.975;
		// 		if (Math.abs(this.y) >= depth ) this.y*=-0.975;
		// 		if (Math.abs(this.z) >= depth ) this.z*=-0.975;
		// 	}
		//
		// 	this.frame = -Math.PI;
		// 	this.vl.set(0,0,0);
		// 	this.del_pos.copy(this);
		// 	this.delta_p = 0.0;///this.dir.set(0,0,0);
		// }
		//
		if(!this.vars.three_d){
			this.setY(-0.75);
		}
	}

	//particle_refresh_rate
	//particle_propagate


	get_sector(){
		const s = v.addVectors(width_vector, this).multiplyScalar(0.5).toArray().map((l) => Math.floor(l));
		return Math.min(...s) >= 0 && Math.max(...s) <= (this.vars.cell_size)-1 ? rip[s[0]][s[1]][s[2]] : null;
	}

}


class teardown_cell extends THREE.Group{

	constructor(id, loc, locx, vars) {
		super();
		this.cell_id = id;
		this.loc = new THREE.Vector3().fromArray(loc);//.multiplyScalar(1);
		this.userData.cell_id = id+'_instance';
		this.locx = locx;
		this.scalar = 0.0;
		this.hue = 0.0;
		this.marker = null;
		this.arrow = null;
		this.temp_v = new THREE.Vector3();
		this.temp_w = new THREE.Vector3();
		this.temp_a = 0.0;
		this.vars = vars;
		//this.scale = this.vars.sector_size;///1.0sphere.scale.setScalar(this.vars.sector_size);
	}

	set_data_from_fragment(index){
		if(this.hasOwnProperty('data_fragment')) {

			//const w_value = this.data_fragment[index];
			this.temp_w.copy(this.data_fragment[index]);

			this.scalar = normalize_val(this.temp_w.length(), this.vars.wind_min, this.vars.wind_max);
			//
			// const w_value = this.data_fragment[index][0][0];
			// this.marker.userData.frag = w_value;
			// //console.log(w_value);
			//
			// let cpv = w_value.split(' ');
			// const U = parseFloat(cpv[0]);
			// const V = parseFloat(cpv[1]);
			//
			// const WDIR = 270 - (Math.atan2(-V, U) * (180 / Math.PI));
			// const WLEN = Math.sqrt(Math.pow(U, 2) + Math.pow(V, 2));
			//
			// this.scalar = WLEN;//1-(1/WLEN);
			// // w.set(1,0,0);
			// //copy(w);//.multiplyScalar(100.0);
			// v.set(0,1,0);
			// w.set(1,0,0);
			// w.applyAxisAngle(v, WDIR*(Math.PI/180));
			// w.multiplyScalar(this.scalar).normalize();
			// this.temp_w.copy(w);
			// console.log(this.temp_w);
			//
			// this.temp_w.copy(w);//.multiplyScalar(100.0);
			// this.marker.userData.dire = this.temp_w.toArray();
			// 		const x = c % data_width;
			// const y = Math.floor(c / data_width);
			// const z = data.wind[y][x];// #//POWER MOVE
			// let cpv = z.split(' ');
			// const U = parseFloat(cpv[0]);
			// const V = parseFloat(cpv[1]);
			//
			// //#const WDIR = Math.atan2(V,U);//*180/Math.PI;
			// const WDIR = 270-(Math.atan2(-V,U)*(180/Math.PI));
			// const WLEN = Math.sqrt(Math.pow(U,2)+Math.pow(V,2));
		}
	}

	idle(sel=null){
		if(this.marker.scale !== this.vars.sector_size) this.marker.scale.setScalar(this.vars.sector_size);
		this.marker.material.color.setHSL(this.hue, 1, this.scalar > 0.5 ? 0.5: this.scalar);
		this.arrow.setLength(this.scalar);
		this.arrow.setDirection(this.temp_w.clone().normalize());
		if(!this.vars.data_driven) this.scalar *= 0.9;
	}

	update(sel=null){
		if(!this.vars.data_driven){
			this.nearest().map((k) => {
				this.parent.children[k].temp_w.lerp(this.temp_w, this.scalar);
				this.parent.children[k].scalar += (this.scalar/(50+this.vars.sector_carry));
				this.parent.children[k].hue += (this.hue-this.parent.children[k].hue)*this.scalar;
			} );
		}
	}

	init(){
		const dir = new THREE.Vector3(0, 0, 1);
		const origin = this.loc.clone();
		const length = 0.75;
		let hex = 0xFFFF00;
		const arrow_helper = new THREE.ArrowHelper(dir, origin, length, hex);
		this.arrow = arrow_helper;
		this.add(arrow_helper);
		this.arrow.visible = this.vars.arrows;

		const geometry = new THREE.BoxBufferGeometry(2.0,2.0,2.0);//( 1.0, 32, 16 );
		//const geometry = new THREE.SphereGeometry( 1.0, 32, 16 );
		const material = new THREE.MeshBasicMaterial( {
			color: 0xffff00,
			side: THREE.FrontSide,
			alphaTest: 0.6,
			transparent: true,
			opacity: 0.6,
			blending: THREE.AdditiveBlending,
			depthWrite: false,		//blendSrcAlpha: 0,
			depthTest: false,
			//depthFunc: THREE.AlwaysDepth, //THREE.NeverDepth,
		} );
		const sphere = new THREE.Mesh( geometry, material );
		sphere.userData.cell_id = this.cell_id;
		sphere.userData.locx = this.locx;
		sphere.position.copy(this.loc);
		this.marker = sphere;
		this.add(sphere);
		this.marker.visible = this.vars.sectors;

		this.position.copy(this.loc);

		return this;
	}

	nearest(){
		let l = [];
		for(let i in this.locx) {
			let c = [...this.locx];
			let n = this.locx[i];
			for (let dir of tgl) {
				c[i] = n + dir > -1 && n + dir < depth ? n + dir : null;
				if(!c.includes(null)) l.push(rip[c[0]][c[1]][c[2]]);
			}
		}
		return l;
	}

}


function make(parent, vars, c_depth= 16){
	let count = 0;
	let pseudo = 0;//Math.pow(c_depth,2);
	let hold = (c_depth/2)-1;
	depth = c_depth;
	rip = [];

	for ( let x = 0; x < depth; x++ ) {
		rip[x] = [];
		for (let y = 0; y < depth; y++) {
			rip[x][y] = [];
			for (let z = 0; z < depth; z++) {
				const ost = (depth-1)/2;
				const cell = new teardown_cell(count, [x-ost,y-ost,z-ost], [x,y,z], vars).init();
				rip[x][y][z] = count;
				if(y === hold){
					cell.pseudo = pseudo;
					cell.marker.userData.pseudo = pseudo;
					pseudo++;
				}
				parent.add(cell);
				count++;
			}
		}
	}

	for(let i in parent.children){
		let cell = parent.children[i];
		cell.nearest();
	}

	// #// LEFT, RIGHT, UP, DOWN, FRONT, BACK
	// console.log(rip);
	return c_depth;
}


function make_cloud(parent, vars, c_count=particle_count){

	width_vector.set(depth, depth, depth);

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

	const mesh = new THREE.InstancedMesh( geometry, material, c_count );

	parent.add(mesh);

	for(let c = 0; c < c_count; c++){
		particles.push(new teardown_particle(c,'scatter', vars));
	}


	return particles;
}




export { make, teardown_particle, make_cloud }
