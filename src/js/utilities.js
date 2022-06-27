import {vars} from "./vars";
import * as THREE from "three";
import * as MATS from "./materials";

const km_deg = 110.948;
const deg_to_km = (v) => (v * km_deg);
const normalize_val = (val, mi, ma) => (val - mi) / (ma - mi);

const w = new THREE.Vector3();
const k = new THREE.Vector3();
const v = new THREE.Vector3();

function get_centroid(points_array) {
	const L = points_array.length;
	let xx = 0, yy = 0, zz = 0;
	for (let pt of points_array) {
		xx += pt.x;
		yy += pt.y;
		zz += pt.z;
	}
	return [xx / L, yy / L, zz / L];
}

function naturalize_on_loop(value, side = false) {
	if (value > 1) return side ? value - 1 : 0;
	if (value < 0) return side ? 1 + value : 1;
	return value;
}

function naturalize_limits(value) {
	if (value > 1) return 1;
	if (value < 0) return 0;
	return value;
}

function get_sector_from_world_point_noscale(vars_map, point) {

	// const px = point.x + ((1/vars_map.map_deg)*vars_map.sector_dims[0])/2;
	// const py = (point.y*-1) + ((1/vars_map.map_deg)*vars_map.sector_dims[1])/2;
	//
	const px = (point.x*(1/vars_map.map_deg)) + (vars_map.sector_dims[0])/2;
	const py = ((point.y*(1/vars_map.map_deg))*-1) + (vars_map.sector_dims[1])/2;

	let cpx = Math.floor(px);
	let cpy = Math.floor(py);

	// if(cpx === vars_map.sector_dims[0]) cpx -= 1;
	// if(cpx < 0) cpx += 1;
	// if(cpy === vars_map.sector_dims[1]) cpy -= 1;
	// if(cpy < 0) cpy += 1;
	let cfx = ((px-cpx));
	let cfy = ((py-cpy));

	return [(cpy*((1)*vars_map.sector_dims[0]))+cpx, cfx, cfy]
	//return [(cpy*((1)*vars_map.sector_dims[0]))+cpx, cfx, cfy, cpx, cpy, vars_map.sector_dims[0], vars_map.sector_dims[1], point.x, point.y]
	//const px = +(vars_map.sector_dims[0])/2);
	//(vars.map.map_deg)*vars.map.sector_dims[0],
}

function get_sector_from_world_point(vars_map, world_point){

	const px = (((1/vars_map.map_deg)*world_point.x)+(vars_map.sector_dims[0]*vars_map.s)/2)/vars_map.s;
	const py = (((1/vars_map.map_deg)*world_point.z)+(vars_map.sector_dims[1]*vars_map.s)/2)/vars_map.s;

	let cpx = Math.floor(px);
	let cpy = Math.floor(py);
	if(cpx === vars_map.sector_dims[0]) cpx -= 1;
	if(cpx < 0) cpx += 1;
	if(cpy === vars_map.sector_dims[1]) cpy -= 1;
	if(cpy < 0) cpy += 1;
	// #//WHOA

	let cfx = ((px-cpx));
	let cfy = ((py-cpy));

	return [vars_map.sector_array[cpy][cpx],cfx,cfy]; //sector X x Y.
}

//||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||
function get_point_on_guide(world_point, guide, vars_curve_segments) {
	//https://stackoverflow.com/questions/50257825/get-position-of-point-on-curve
	//const guide = get_guide(guide_id);
	const guide_curve = guide.userData.guide.curve;
	let searchArray = [];
	let uPosition = null;
	let c = null;
	// Loop through curve.points to find our final point
	// bear in mind offset at 'l' which calculates the min distance via the number of points on the line.
	for (let i = 0; i < guide_curve.points.length; i++) {
		searchArray.push(guide_curve.points[i]);
		const gl = guide_curve.getLength();
		let d = guide_curve.points[i].distanceTo(world_point);
		let l = 1 / (guide_curve.points.length / gl);
		if (d < l && searchArray.length > 1) {
			let curve2 = new THREE.CatmullRomCurve3(searchArray);
			curve2.arcLengthDivisions = searchArray.length * vars_curve_segments;//vars.curve_segments;
			curve2.updateArcLengths();
			uPosition = curve2.getLength() / gl;
			let t = guide_curve.getTangentAt(uPosition);
			k.subVectors(world_point, guide_curve.points[i]).normalize();
			let sign = Math.sign(k.dot(t));
			uPosition = (curve2.getLength() / gl) + ((d / gl) * sign);
			uPosition = naturalize_on_loop(uPosition, true);
			break;
		}
	}

	if (uPosition !== null) {
		let um = guide_curve.getUtoTmapping(uPosition);
		c = guide_curve.getPoint(um);
	}

	return [uPosition, c];
}

function _pointOnLine(v2a, v2b, pt) {
    let isValid = false;



    var r = new Microsoft.Maps.Location(0, 0);
    if (line1.latitude == line2.latitude && line1.longitude == line2.longitude) line1.latitude -= 0.00001;

    var U = ((pt.latitude - line1.latitude) * (line2.latitude - line1.latitude)) + ((pt.longitude - line1.longitude) * (line2.longitude - line1.longitude));

    var Udenom = Math.pow(line2.latitude - line1.latitude, 2) + Math.pow(line2.longitude - line1.longitude, 2);

    U /= Udenom;

    r.latitude = line1.latitude + (U * (line2.latitude - line1.latitude));
    r.longitude = line1.longitude + (U * (line2.longitude - line1.longitude));

    var minx, maxx, miny, maxy;

    minx = Math.min(line1.latitude, line2.latitude);
    maxx = Math.max(line1.latitude, line2.latitude);

    miny = Math.min(line1.longitude, line2.longitude);
    maxy = Math.max(line1.longitude, line2.longitude);

    isValid = (r.latitude >= minx && r.latitude <= maxx) && (r.longitude >= miny && r.longitude <= maxy);

    return isValid ? r : null;
}


function get_projection(vect, pt, seg_length){
	w.copy(pt);
	w.projectOnVector(vect);
	const psi = Math.sign(vect.dot(w)); //#//use? was missing a point or two. && psi > 0
	//#//tolerance at seg_length gets more obscure points.
	return w.length() < seg_length*2 ? w.clone() : false;
}

function fast_neighbors(points, pt, threshold_distance){
	let n = points.length;
	let d = 0.0;
	let distance = []; //new Array(n);
	for(let i = 0; i < n; i++) {
			v.subVectors(points[i].position, pt);
			d = v.lengthSq();
			if(d < threshold_distance) distance.push([d, i]);
	}
	distance.sort(function(a,b){return a[0]-b[0];});
	return distance.map(g => points[g[1]]);
}


function get_guide_data_points(guide, map_tiles_context, map_points_context, vars_curve_segments){
	//alert(Object.entries(guide.userData.guide));
	//console.log(guide.userData);

	const guide_curve = guide.userData.guide.curve;
	const checks = guide_curve.points;
	const check_len = guide_curve.closed ? (checks.length) : (checks.length-1);
	const L = guide_curve.getLength()/check_len;

	let scanned_elements = {};

	const available_points = map_tiles_context.children
		.filter(c => c.hasOwnProperty('places'))
		.map(c => c.places.children).flat()
		.map(c => c.userData.place);

	available_points.forEach(c => {
		c.guide_id = guide.userData.guide.shape;
		scanned_elements[c.object_id] = [100.0, null, null]
	});

	//

	for(let i = 0; i<checks.length; i++) {
		const p = checks[i];
		const v_valid = fast_neighbors(available_points, p, 0.5);
		const p_offset = i/check_len;
		const p2_offset = (i+1)/check_len;

		if(i < (checks.length-1) ){
			const p2 = checks[i+1];
			w.subVectors(p2, p);
			const tangent = w.clone();
			const VL = tangent.length();

			for(let vc of v_valid){
				const carrier_pos = vc.position;
				v.subVectors(carrier_pos, p);
				const s = get_projection(tangent, v, VL);

				if(s) {
					const adapted = (p2_offset-p_offset)*(s.length()/VL);
					console.log(p_offset, adapted, p_offset+adapted);
					const pval = naturalize_limits(p_offset+adapted);

					const adpt = guide_curve.getPointAt(pval);
					w.subVectors(carrier_pos, adpt);
					const gdl = w.lengthSq();

					if(gdl < scanned_elements[vc.object_id][0]) {
						scanned_elements[vc.object_id] = [gdl, adpt, carrier_pos];
						vc.guide_position = p_offset+adapted;
					}
				}
			}
		}
	}

	Object.keys(scanned_elements).forEach(g => {
		const k = scanned_elements[g];
		//console.log(k);
		if(k[1]) {
			const points = [k[1], k[2]];
			const geometry = new THREE.BufferGeometry().setFromPoints( points );
			const line = new THREE.Line( geometry, MATS.auxPointsLineMaterial );
			map_points_context.add(line);
		}
	});

	//console.log(available_points);
	return available_points;
}


function curve_tangent_point_test(point, guide, map_context, map_points_context, map_tiles_context, vars_curve_segments){
	//#//cTEST THIS 1000X
	//#//cMAYBE A NEAREST TEST IS THE BEST..?
	//https://www.r-bloggers.com/2021/10/multiple-linear-regression-made-simple/
	console.log("THIS WAS CALLED");

	const guide_curve = guide.userData.guide.curve;
	const checks = guide_curve.points;
	const check_len = guide_curve.closed ? (checks.length) : (checks.length-1);
	const L = guide_curve.getLength()/check_len;

	console.log("curve seg length:",L,check_len);

	let scanned_elements = {};
	let cloud = [];
	let cloud2 = [];
	let test_points = [];

	//let available_points = [];

	const available_points = map_tiles_context.children
		.filter(c => c.hasOwnProperty('places'))
		.map(c => c.places.children).flat()
		.map(c => c.userData.place);

	console.log(available_points);
	return;

	available_points.forEach(c => scanned_elements[c.id] = [100.0, null, null]);

	//console.log(scanned_elements);

	let p_ctr = 0;
	for(let p of checks) {
		const v_valid = fast_neighbors(available_points, p, 1.0);
		//console.log(v_valid);

		const p_offset = p_ctr/check_len;
		const p2_offset = (p_ctr+1)/check_len;
		//&& p_ctr >= 65 && p_ctr <= 100

		if(p_ctr<(checks.length-1) ){
			const p2 = checks[p_ctr+1];
			w.subVectors(p2, p);

			const tangent = w.clone();
			const VL = tangent.length();

			let rmax = 100.0;
			let filtered = [];

			for(let vc of v_valid){
				//for wudi const carrier_pos = new THREE.Vector3(vc.userData.data_point.data.a[0],vc.userData.data_point.data.a[1],0.0);
				const carrier_pos = vc.position;

				v.subVectors(carrier_pos, p);
				const s = get_projection(tangent, v, VL);

				if(s) {
					//const offset_length = s.length()/tangent.length();
					const adapted = (p2_offset-p_offset)*(s.length()/VL);

					// const unit_len = (L/(vars_curve_segments/1));
					//
					// const adapted = (offset_length/L)*unit_len;

					const adpt = guide_curve.getPoint(p_offset+adapted);
					w.subVectors(carrier_pos, adpt);

					const gdl = w.lengthSq();

					//console.log(p_ctr, gdl, rmax);

					// if(gdl < rmax){
					// 	console.log('select',p_ctr,gdl);
					// 	filtered = [gdl, adpt.clone(), vc.position.clone()];
					//
					// 	//test_points.push(adpt);
					// 	rmax = gdl;
					// }


					//
					if(gdl < scanned_elements[vc.id][0]) {
						scanned_elements[vc.id] = [gdl, adpt, carrier_pos];
						//console.log(gdl);
						// const sdpt = guide_curve.getPoint(p_offset);
						// cloud.push(sdpt);
						cloud.push(s.add(p));
						cloud2.push(tangent.clone().add(p));
						cloud.push(p);
					}
					// //


					//
					// //console.log(p_ctr, (offset_length/L)*unit_len);
					//
					// const sdpt = guide_curve.getPoint(p_offset+unit_len);
					// cloud.push(sdpt);
					// // cloud.push(dpt2);
				}

			}

			//scanned_elements.push(filtered);//[gdl, adpt, vc.position]);


		}



		p_ctr++;
	}


  Object.keys(scanned_elements).forEach(g => {
		//console.log(g);
		const k = scanned_elements[g];
		if(k[1]) {
			//console.log(k,scanned_elements[k]);
			test_points.push(k[1])
			const points = [k[1], k[2]];
			const geometry = new THREE.BufferGeometry().setFromPoints( points );
			const line = new THREE.Line( geometry, MATS.auxPointsLineMaterial );
			map_points_context.add(line);
		}
	});
//
// //test_points.push(adpt);


	// console.log(scanned_sectors);
	// console.log(scanned_elements);

	// let pointsGeometry = new THREE.BufferGeometry().setFromPoints(cloud);
	// const spt = new THREE.Points(pointsGeometry, MATS.auxPointsMaterial);
	// map_points_context.add(spt);
	//
	// pointsGeometry = new THREE.BufferGeometry().setFromPoints(cloud2);
	// const spt1 = new THREE.Points(pointsGeometry, MATS.auxPointsMaterial2);
	// map_points_context.add(spt1);
	//
	// pointsGeometry = new THREE.BufferGeometry().setFromPoints(test_points);
	// const spt2 = new THREE.Points(pointsGeometry, MATS.auxPointsMaterial3);
	// map_points_context.add(spt2);

}

function EEEcurve_tangent_point_test(point, guide, map_context, map_points_context, map_tiles_context, vars_curve_segments){
	//#//cTEST THIS 1000X

	const guide_curve = guide.userData.guide.curve;
	const refine = 1;
	const checks = guide_curve.points;//guide_curve.getSpacedPoints((guide_curve.points.length-1)*refine);
	const check_len = guide_curve.closed ? (checks.length) : (checks.length-1);

	const L = guide_curve.getLength()/(checks.length);

	console.log("curve seg length:",L,checks.length);

	let scanned_sectors = {};
	let scanned_elements = {};
	let cloud = [];
	let cloud2 = [];
	let test_points = [];


	let available_points = [];
	//get all places here:
	// map_tiles_context.children
	// 	.filter(c => c.hasOwnProperty('places'))
	// 	.map(c => available_points.push(...c.places.children));
	//
	//get all wudi-data here:
	map_tiles_context.children
		.filter(c => c.hasOwnProperty('wudi'))
		.map(c => available_points.push(...c.wudi.children));



	available_points.forEach(c => {
		//console.log(typeof(c), c.type);
		if(c.type === 'Mesh') scanned_elements[c.id] = [100.0, null, null]
	})

	//console.log(scanned_elements);


	//return;
// head.places.children.forEach(c => scanned_elements[c.id] = [100.0, null]);
// 		// 		scanned_sectors[r] = head.places.children;

	let p_ctr = 0;
	for(let p of checks) {
		// k.copy(p);
		// map_context.localToWorld(k);
		// const r = get_sector_from_world_point(vars.map, k);
		// if (!scanned_sectors.hasOwnProperty(r)){
		// 	scanned_sectors[r] = [];
		// 	let head = map_tiles_context.children[r];
		// 	if (head.hasOwnProperty('places')) {
		// 		head.places.children.forEach(c => scanned_elements[c.id] = [100.0, null]);
		// 		scanned_sectors[r] = head.places.children;
		// 		console.log(scanned_sectors[r]);
		// 		console.log(scanned_elements);
		// 	}
		// }

		//const v_valid = scanned_sectors[r];

		const v_valid = fast_neighbors(available_points, p, 2.0);
		//console.log(v_valid);

		const p_offset = p_ctr/check_len;
		const p2_offset = (p_ctr+1)/check_len;
		//&& p_ctr >= 65 && p_ctr <= 100

		if(p_ctr<(checks.length-1) ){
			const p2 = checks[p_ctr+1];
			w.subVectors(p2, p);

			const tangent = w.clone();
			const VL = tangent.length();

			let rmax = 100.0;
			let filtered = [];

			for(let vc of v_valid){
				v.subVectors(vc.position, p);
				const s = get_projection(tangent, v, VL);

				if(s) {
					//const offset_length = s.length()/tangent.length();
					const adapted = (p2_offset-p_offset)*(s.length()/VL);

					// const unit_len = (L/(vars_curve_segments/1));
					//
					// const adapted = (offset_length/L)*unit_len;

					const adpt = guide_curve.getPoint(p_offset+adapted);
					w.subVectors(vc.position, adpt);

					const gdl = w.lengthSq();

					console.log(p_ctr, gdl, rmax);

					// if(gdl < rmax){
					// 	console.log('select',p_ctr,gdl);
					// 	filtered = [gdl, adpt.clone(), vc.position.clone()];
					//
					// 	//test_points.push(adpt);
					// 	rmax = gdl;
					// }


					//
					if(gdl < scanned_elements[vc.id][0]) {
						scanned_elements[vc.id] = [gdl, adpt, vc.position];
						console.log(gdl);
						const sdpt = guide_curve.getPoint(p_offset);
						cloud.push(sdpt);
						// cloud.push(s.add(p));
						// cloud2.push(tangent.clone().add(p));
						// cloud.push(p);
					}
					// //


					//
					// //console.log(p_ctr, (offset_length/L)*unit_len);
					//
					// const sdpt = guide_curve.getPoint(p_offset+unit_len);
					// cloud.push(sdpt);
					// // cloud.push(dpt2);
				}

			}

			//scanned_elements.push(filtered);//[gdl, adpt, vc.position]);


		}



		p_ctr++;
	}


  Object.keys(scanned_elements).forEach(g => {
		console.log(g);
		const k = scanned_elements[g];
		if(k[1]) {
			//console.log(k,scanned_elements[k]);
			test_points.push(k[1])
			const points = [k[1], k[2]];
			const geometry = new THREE.BufferGeometry().setFromPoints( points );
			const line = new THREE.Line( geometry, MATS.auxPointsLineMaterial );
			map_points_context.add(line);
		}
	});
//
// //test_points.push(adpt);


	console.log(scanned_sectors);
	console.log(scanned_elements);

	let pointsGeometry = new THREE.BufferGeometry().setFromPoints(cloud);
	const spt = new THREE.Points(pointsGeometry, MATS.auxPointsMaterial);
	map_points_context.add(spt);

	pointsGeometry = new THREE.BufferGeometry().setFromPoints(cloud2);
	const spt1 = new THREE.Points(pointsGeometry, MATS.auxPointsMaterial2);
	map_points_context.add(spt1);

	pointsGeometry = new THREE.BufferGeometry().setFromPoints(test_points);
	const spt2 = new THREE.Points(pointsGeometry, MATS.auxPointsMaterial3);
	map_points_context.add(spt2);

}

function curve_original_point_test(point, guide, map_context, map_points_context, map_tiles_context, vars_curve_segments){
	const guide_curve = guide.userData.guide.curve;
	const checks = guide_curve.points;
	let scanned_sectors = [];
	let p_ctr = 0;
	let cloud = [];

	for(let p of checks) {
		k.copy(p);
		map_context.localToWorld(k);
		const r = get_sector_from_world_point(vars.map, k);
		const p_offset = p_ctr / (checks.length - 1);


		const dpt = guide_curve.getPoint(p_offset);
		//cloud.push(dpt);

		if (!scanned_sectors.includes(r)) {
			scanned_sectors.push(r);
			console.log('s', r);

			let head = map_tiles_context.children[r];
			if (head.hasOwnProperty('wudi')) {
				const wudi = head.wudi.children.filter(c => c.userData.hasOwnProperty('data_point'));
				console.log("wudi-points", wudi.length);


				for(let w of wudi) {
					//const ni = get_closest_index(checks, w.position)[0][1];
					const res = get_point_on_guide(w.position, guide, vars_curve_segments);
					//const pt = guide_curve.getPointAt(res[0]);// / (checks.length - 1));
					if(res[1]) cloud.push(res[1]);
				}


			}
		}
		p_ctr++;
	}

	let pointsGeometry = new THREE.BufferGeometry().setFromPoints(cloud);
	const spt = new THREE.Points(pointsGeometry, MATS.auxPointsMaterial);

	// pointsGeometry = new THREE.BufferGeometry().setFromPoints(cloud2);
	// const spt2 = new THREE.Points(pointsGeometry, MATS.auxPointsMaterial2);

	map_points_context.add(spt);
	//map_points_context.add(spt2);

	console.log(scanned_sectors);

}

function curve_point_test(point, guide, map_context, map_points_context, map_tiles_context){
	//#//const guide = get_guide(guide_id);
	const guide_curve = guide.userData.guide.curve;

	const refine = 32;
	const checks = guide_curve.points;
	const refine_checks = guide_curve.getSpacedPoints((checks.length-1)*refine);
	//const checks = guide_curve.getSpacedPoints(shecks.length*refine);

	let scanned_sectors = [];
	let cloud = [];
	let cloud2 = [];

	console.log(checks.length);

	function get_closest_index(points,point){
		let n = points.length;
    let distance = new Array(n);
    for(let i = 0; i < n; i++) {
				v.subVectors(points[i],point);
        //distance[i] = [point.distanceTo(points[i]), i];
        //distance[i] = [point.distanceTo(points[i]), i];
        distance[i] = [v.lengthSq(), i];
    }
    distance.sort(function(a,b){return a[0]-b[0];});
		return distance;
	}


	let p_ctr = 0;
	for(let p of checks){
		k.copy(p);
		map_context.localToWorld(k);
		const r = get_sector_from_world_point(vars.map, k);
		const p_offset = p_ctr/(checks.length-1);


		const dpt = guide_curve.getPoint(p_offset);
		//cloud.push(dpt);

		if(!scanned_sectors.includes(r)) {
			scanned_sectors.push(r);
			console.log('s',r);

			let head = map_tiles_context.children[r];
			if(head.hasOwnProperty('wudi')){
				const wudi = head.wudi.children.filter(c => c.userData.hasOwnProperty('data_point'));
				console.log("wudi-points", wudi.length);

				for(let w of wudi) {
					const ni = get_closest_index(checks, w.position)[0][1];
					const pt = guide_curve.getPoint(ni / (checks.length-1));
					cloud.push(pt);


					//
					// // #//THIS (sometimes) WORKS as a one-off
					// // const n = ni*refine;
					// // const nj = get_closest_index(refine_checks, w.position)[0][1];
					// // const dpt = guide_curve.getPointAt(nj / (refine_checks.length));
					// // cloud2.push(dpt);
					//
					// const nii = ni*refine;
					// let lower, upper;
					// //
					// // if(nii<refine){
					// // 	lower = nii;
					// // } else{
					// // 	lower = nii-refine;
					// // }
					// lower = nii-refine;
					// upper = nii+refine;
					//
					// const revised_set = refine_checks.slice(lower, upper);
					// const ni_level_2 = get_closest_index(revised_set, w.position)[0][1];
					// const l2 = lower+(ni_level_2);
					// const mtl = l2/(refine_checks.length);
					// const dpt = guide_curve.getPointAt(mtl);
					// cloud2.push(dpt);

				}





			}
		}

		console.log(p_ctr+'/'+(checks.length-1), r);


		p_ctr++;
		/*
		if(r !== undefined && !scanned_sectors.includes(r)) {
			scanned_sectors.push(r);
			let head = map_tiles_context.children[r];
			if(head.hasOwnProperty('wudi')){
			const wudi = head.wudi.children.filter(c => c.userData.hasOwnProperty('data_point'));
			console.log("sector", r);

			for(let w of wudi) {
				const ni = get_closest_index(checks, w.position)[0][1];
				const pt = guide_curve.getPointAt(ni/checks.length);

				console.log(p_ctr++, ni);
				const nii = ni*refine;
				let lower, upper;

				if(nii<refine){
					lower = nii;
				} else{
					lower = nii-refine;
				}

				upper = nii+refine;

				const revised_set = refine_checks.slice(lower, upper);
				const ni_level_2 = get_closest_index(revised_set, w.position)[0][1];
				const l2 = (lower)+(ni_level_2);
				const mtl = l2/(checks.length*refine);
				const dpt = guide_curve.getPointAt(mtl);
				cloud2.push(dpt);

				console.log(ni, nii, ni_level_2);

				console.log(p_ctr, revised_set);


				cloud.push(pt);
				// console.log(ni,ni/checks.length);
				// if(ni<refine) console.log("SPECIAL CASE");

				// const nii = ni*refine;
				// const revised_set = refine_checks.slice(nii-refine, nii+refine);
				// console.log(revised_set);
				//
				// console.log(ni,nii);
				// console.log(revised_set);
				//
				// const ni2 = get_closest_index(revised_set, w.position)[0][1];
				// const l2 = nii-(refine-ni2);
				// const mtl = l2/(checks.length*refine);
				// const dpt = guide_curve.getPointAt(mtl);
				// cloud2.push(dpt);
				//
				// console.log(mtl);

				//console.log(animals.slice(2, 4)); slice from to;


				//from first result index, grow the field out exponentially.




				// const ref = get_point_on_guide(w.position, guide_id);
				// console.log(ref[1]);
				// map_group.worldToLocal(ref[1]);
				// cloud.push(ref[1]);


			}
			// const points = wudi.map(w => w.userData.data_point.data.m);
			//
			// for(let t of points) {
			// 	console.log(t);
			// 	const wp =
			// 	const ref = get_point_on_guide(world_point, guide_id) {
			// }

		}

	}
		*/
	}


	let pointsGeometry = new THREE.BufferGeometry().setFromPoints(cloud);
	const spt = new THREE.Points(pointsGeometry, MATS.auxPointsMaterial);

	pointsGeometry = new THREE.BufferGeometry().setFromPoints(cloud2);
	const spt2 = new THREE.Points(pointsGeometry, MATS.auxPointsMaterial2);

	map_points_context.add(spt);
	map_points_context.add(spt2);

	console.log(scanned_sectors);
	//console.log(guide_curve.getSpacedPoints(5));
	//https://stackoverflow.com/questions/50257825/get-position-of-point-on-curve

}

function XX_curve_tangent_point_test(point, guide, map_context, map_points_context, map_tiles_context){
	//#//const guide = get_guide(guide_id);
	const guide_curve = guide.userData.guide.curve;

	const refine = 32;
	const checks = guide_curve.points;
	const refine_checks = guide_curve.getSpacedPoints((checks.length-1)*refine);
	//const checks = guide_curve.getSpacedPoints(shecks.length*refine);

	let scanned_sectors = [];
	let cloud = [];
	let cloud2 = [];

	console.log(checks.length);

	function get_closest_index(points,point){
		let n = points.length;
    let distance = new Array(n);
    for(let i = 0; i < n; i++) {
				v.subVectors(points[i],point);
        //distance[i] = [point.distanceTo(points[i]), i];
        //distance[i] = [point.distanceTo(points[i]), i];
        distance[i] = [v.lengthSq(), i];
    }
    distance.sort(function(a,b){return a[0]-b[0];});
		return distance;
	}

	const force_c = new THREE.Vector3(0,0,0);
	const up = new THREE.Vector3(0,0,1).normalize();
	map_context.worldToLocal(force_c);//.normalize();
	console.log(force_c);

	let p_ctr = 0;
	for(let p of checks){
		k.copy(p);
		map_context.localToWorld(k);
		const r = get_sector_from_world_point(vars.map, k);
		const p_offset = p_ctr/(checks.length-1);

		const dpt = guide_curve.getPoint(p_offset);
		const tangent = guide_curve.getTangent(p_offset);

		v.crossVectors(tangent,up).normalize();

		console.log(tangent);
		cloud.push(dpt);
		w.addVectors(dpt, v.multiplyScalar(0.01));
		cloud.push(w.clone());

		//
		// w.subVectors(dpt, force_c).normalize();
		// const o = w.dot(tangent);
		//
		// if(Math.abs(o) < 0.5) {
		// 	console.log(o);
		//
		// 	cloud.push(dpt);
		// }
		/*
		if(!scanned_sectors.includes(r)) {
			scanned_sectors.push(r);
			console.log('s',r);

			let head = map_tiles_context.children[r];
			if(head.hasOwnProperty('wudi')){
				const wudi = head.wudi.children.filter(c => c.userData.hasOwnProperty('data_point'));
				console.log("wudi-points", wudi.length);

				for(let sw of wudi) {
					console.log(sw);

					v.copy(sw.position);//.normalize();
					w.subVectors(v, k).normalize();
					const o = tangent.dot(w);
					console.log(o);

					const ni = get_closest_index(checks, sw.position)[0][1];
					const pt = guide_curve.getPoint(ni / (checks.length-1));
					cloud.push(pt);


					//
					// // #//THIS (sometimes) WORKS as a one-off
					// // const n = ni*refine;
					// // const nj = get_closest_index(refine_checks, w.position)[0][1];
					// // const dpt = guide_curve.getPointAt(nj / (refine_checks.length));
					// // cloud2.push(dpt);
					//
					// const nii = ni*refine;
					// let lower, upper;
					// //
					// // if(nii<refine){
					// // 	lower = nii;
					// // } else{
					// // 	lower = nii-refine;
					// // }
					// lower = nii-refine;
					// upper = nii+refine;
					//
					// const revised_set = refine_checks.slice(lower, upper);
					// const ni_level_2 = get_closest_index(revised_set, w.position)[0][1];
					// const l2 = lower+(ni_level_2);
					// const mtl = l2/(refine_checks.length);
					// const dpt = guide_curve.getPointAt(mtl);
					// cloud2.push(dpt);

				}





			}
		}

		console.log(p_ctr+'/'+(checks.length-1), r);
		*/

		p_ctr++;
		/*
		if(r !== undefined && !scanned_sectors.includes(r)) {
			scanned_sectors.push(r);
			let head = map_tiles_context.children[r];
			if(head.hasOwnProperty('wudi')){
			const wudi = head.wudi.children.filter(c => c.userData.hasOwnProperty('data_point'));
			console.log("sector", r);

			for(let w of wudi) {
				const ni = get_closest_index(checks, w.position)[0][1];
				const pt = guide_curve.getPointAt(ni/checks.length);

				console.log(p_ctr++, ni);
				const nii = ni*refine;
				let lower, upper;

				if(nii<refine){
					lower = nii;
				} else{
					lower = nii-refine;
				}

				upper = nii+refine;

				const revised_set = refine_checks.slice(lower, upper);
				const ni_level_2 = get_closest_index(revised_set, w.position)[0][1];
				const l2 = (lower)+(ni_level_2);
				const mtl = l2/(checks.length*refine);
				const dpt = guide_curve.getPointAt(mtl);
				cloud2.push(dpt);

				console.log(ni, nii, ni_level_2);

				console.log(p_ctr, revised_set);


				cloud.push(pt);
				// console.log(ni,ni/checks.length);
				// if(ni<refine) console.log("SPECIAL CASE");

				// const nii = ni*refine;
				// const revised_set = refine_checks.slice(nii-refine, nii+refine);
				// console.log(revised_set);
				//
				// console.log(ni,nii);
				// console.log(revised_set);
				//
				// const ni2 = get_closest_index(revised_set, w.position)[0][1];
				// const l2 = nii-(refine-ni2);
				// const mtl = l2/(checks.length*refine);
				// const dpt = guide_curve.getPointAt(mtl);
				// cloud2.push(dpt);
				//
				// console.log(mtl);

				//console.log(animals.slice(2, 4)); slice from to;


				//from first result index, grow the field out exponentially.




				// const ref = get_point_on_guide(w.position, guide_id);
				// console.log(ref[1]);
				// map_group.worldToLocal(ref[1]);
				// cloud.push(ref[1]);


			}
			// const points = wudi.map(w => w.userData.data_point.data.m);
			//
			// for(let t of points) {
			// 	console.log(t);
			// 	const wp =
			// 	const ref = get_point_on_guide(world_point, guide_id) {
			// }

		}

	}
		*/
	}


	let pointsGeometry = new THREE.BufferGeometry().setFromPoints(cloud);
	const spt = new THREE.Points(pointsGeometry, MATS.auxPointsMaterial);
	//
	// pointsGeometry = new THREE.BufferGeometry().setFromPoints(cloud2);
	// const spt2 = new THREE.Points(pointsGeometry, MATS.auxPointsMaterial2);
	//
	map_points_context.add(spt);
	// map_points_context.add(spt2);
	//
	// console.log(scanned_sectors);
	//console.log(guide_curve.getSpacedPoints(5));
	//https://stackoverflow.com/questions/50257825/get-position-of-point-on-curve

}


export {
	km_deg,
	normalize_val,
	get_centroid,
	deg_to_km,
	naturalize_on_loop,
	get_sector_from_world_point,
	curve_point_test,
	curve_original_point_test,
	curve_tangent_point_test,
	get_point_on_guide,
	get_guide_data_points,
	get_sector_from_world_point_noscale
}
