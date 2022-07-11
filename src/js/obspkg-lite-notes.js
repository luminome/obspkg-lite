//https://jsfiddle.net/chaosed0/b4cqktan/37/ <- this guy
//https://discourse.threejs.org/t/functions-to-calculate-the-visible-width-height-at-a-given-z-depth-from-a-perspective-camera/269
//https://stackoverflow.com/questions/22521982/check-if-point-is-inside-a-polygon

// const parsed = text.split(/\r?\n|\r\n/).map(n => isNaN(parseFloat(n)) ? null : parseFloat(n));
// const array = (new Function("return [" + parsed+ "];")());
// console.log('/', array);

//#//not very nice or precise
//import * as MeshLine from "./vendor/MeshLine.js";
//const material = new MeshLine.MeshLineMaterial({color: 0x0000ff, lineWidth:0.1, resolution:resolution, sizeAttenuation:true});
//const trail_line = new MeshLine.MeshLine();
//trail_line.setGeometry( geometry );//,  function( p ) { return p; }  ); // makes width taper


const sprite_mat = () => {
    const canvas = document.createElement('canvas');
    const size = 32;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const radius = (size - 1) / 2;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(radius, radius, radius, 0, (Math.PI * 4) / 2, false);
    ctx.fill();
    const amap = new THREE.Texture(canvas);
    amap.needsUpdate = true;
    return amap;
}

const A = new THREE.Vector3(0.0, 0.0, 0.0);
const B = new THREE.Vector3(1.0, 0.0, 0.0);
const A2 = A.clone().setZ(0.5);
const B2 = B.clone().setZ(0.5);
const points = [A, A2, B2, B];

//const bar_geometry = new THREE.BufferGeometry().setFromPoints(points);
const bar_geometry = new THREE.BoxBufferGeometry( 1, 0.025, 1 );
bar_geometry.translate(0.5, 0.0, 0.5);
// bar_geometry.deleteAttribute('uv');
// bar_geometry.deleteAttribute('normal');
// bar_geometry.setIndex([0, 1, 2, 2, 3, 0]);
bar_geometry.computeVertexNormals();
bar_geometry.computeBoundingBox();




import * as util from "./obspkg-lite-util";

function plot_data(obj) {
    const keys = vars.data[obj.name].raw[0];
    console.log(keys.map((k, i) => {
        return `${i}:${k}`
    }));
    let group;
    let mat = null;
    let is_instance = false;

    if (obj.style === 'point') {
        is_instance = true;
        //#//for datasets with coordinate geometries
        // const material = new THREE.PointsMaterial({
        //     size: obj.name === 'wudi' ? 0.5 : 0.1,
        //     map: sprite_mat(),
        //     vertexColors: true,
        //     blending: THREE.AdditiveBlending,
        //     depthTest: false,
        //     transparent: true
        // });

        let vertices = [];
        let samples = [];
        let colors = [];

        const datum = {
            len: vars.data[obj.name].raw.length - 1,
            color: [],
            position: []
        }

        for (let i = 1; i < vars.data[obj.name].raw.length; i++) {
            if (Array.isArray(obj.geom_index)) {
                vertices.push(vars.data[obj.name].raw[i][obj.geom_index[0]]);
                vertices.push(vars.data[obj.name].raw[i][obj.geom_index[1]]);
                vertices.push(0.0);

                datum.position.push([vars.data[obj.name].raw[i][obj.geom_index[0]], vars.data[obj.name].raw[i][obj.geom_index[1]], 0.0]);

            } else {
                vertices.push(vars.data[obj.name].raw[i][obj.geom_index][0]);
                vertices.push(vars.data[obj.name].raw[i][obj.geom_index][1]);
                vertices.push(0.0);

                datum.position.push([vars.data[obj.name].raw[i][obj.geom_index][0], vars.data[obj.name].raw[i][obj.geom_index][1], 0.0]);
            }
            if (obj.name === 'wudi') {
                samples.push(vars.data[obj.name].raw[i][8]);
            } else {
                colors.push(0.0, 1.0, 1.0);
                datum.color.push([0.0, 1.0, 1.0]);
            }
        }

        const limits = util.max_min(samples.filter(s => s !== null && s.toString() !== 'null'));

        if (obj.name === 'wudi') {
            let r, b, o = 0.1, l = 0.5;
            for (let s of samples) {
                if (!s) {
                    colors.push(0.0, 0.0, 0.0);//1.0,1.0,1.0);
                    datum.color.push([0.0, 0.0, 0.0]);
                } else {
                    r = s > 0 ? util.norm_val(s, l, limits.max) + l : o;
                    b = s < 0 ? util.norm_val(Math.abs(s), l, Math.abs(limits.min)) + l : o;
                    colors.push(r, o, b);
                    datum.color.push([r, o, b]);
                }
            }
        }
        //console.log(colors);
        //const geometry = new THREE.BufferGeometry();
        //const geometry = new THREE.SphereBufferGeometry( 0.05, 16, 8 );
        const geometry = new THREE.CircleBufferGeometry(0.05, 16);
        geometry.deleteAttribute('uv');
        geometry.deleteAttribute('normal');

        const material = new THREE.MeshBasicMaterial({
            color: 0xFFFFFF,
            side: THREE.FrontSide,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });

        // geometry.setAttribute( 'color', new THREE.Float32BufferAttribute( new Float32Array(colors), 3 ) );
        // geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( vertices, 3 ) );
        // geometry.attributes.color.needsUpdate = true;
        // geometry.attributes.position.needsUpdate = true;

        group = new THREE.InstancedMesh(geometry, material, datum.len);
        group.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        // THREE.DynamicDrawUsage ); //
        // group.instanceMatrix.needsUpdate = true;
        // group.instanceColor.needsUpdate = true;
        // group = new THREE.Points( geometry, material );

        group.name = obj.name;

        obj.geometry_array = datum;

        console.log(obj.name, group);

        //return;
    } else {
        //#//for datasets with polygonal geometries
        //#//MAKE WORK FOR MULTIPOLYS
        group = new THREE.Group();
        group.name = obj.name;
        vars.data[obj.name].raw.forEach((l_obj, i) => {
            if (i > 0) {
                let element;
                const geom_obj = l_obj[10];
                const exterior = array_to_xy(geom_obj.out);

                if (obj.style === 'mesh') {
                    const out_points = exterior.points2;
                    const in_shapes = geom_obj.in.map(i => new THREE.Shape(array_to_xy(i).points2));
                    const polygon_shape = new THREE.Shape(out_points);
                    if (in_shapes.length) polygon_shape.holes = in_shapes;
                    const geometry = new THREE.ShapeBufferGeometry(polygon_shape);
                    const material = new THREE.MeshBasicMaterial({color: 0xffffff});
                    element = new THREE.Mesh(geometry, material);
                } else if (obj.style === 'line') {
                    const geometry = new THREE.BufferGeometry().setFromPoints(exterior.points3);
                    const material = new THREE.LineBasicMaterial({color: vars.colors[obj.name].select[0]});
                    element = new THREE.LineLoop(geometry, material);
                    element.name = `eco${vars.data[obj.name].raw[i][0]}`;
                }

                element.userData.x_coords = exterior.x;
                element.userData.y_coords = exterior.y;
                element.userData.data = {name: obj.name, index: i};
                element.userData.selected = (state) => {
                    element.material.setValues({color: vars.colors[obj.name].select[+state]});
                    element.position.setZ(+state * 0.01);
                    return state;
                }
                element.geometry.computeBoundingBox();
                group.add(element);
            }
        });
    }

    map_container.add(group);
    if (is_instance) {
        draw_data_instanced(group, obj);
    }

}










	import * as THREE from "three";

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

	import * as UTIL from "./utilities";
import {vars} from "./vars";

if(cloud_mesh){
		let i = 0;
		for(let p of particles){
			const sector = UTIL.get_sector_from_world_point_noscale(vars.map, p);
			const ctile = map_tiles_group.children[sector[0]];
			const wind_res = ctile.get_wind_at_point(sector[1], sector[2]);
			if (wind_res){
				p.loc.set(wind_res.x, wind_res.y);
			}else{
				p.loc.set(p.motor.x, p.motor.y);
			}
			p.move();
			let lightness = p.flow * p.delta_p * 200.0;//#// ? x200?
			color.setHSL(0.6, 1.0 , lightness);
			particle_dummy.scale.setScalar(p.scale);
			particle_dummy.position.copy(p);
			particle_dummy.updateMatrix();
			cloud_mesh.setMatrixAt( i, particle_dummy.matrix );
			cloud_mesh.setColorAt( i, color.clone() );
			i++;
		}
		cloud_mesh.instanceMatrix.needsUpdate = true;
		cloud_mesh.instanceColor.needsUpdate = true;
	}