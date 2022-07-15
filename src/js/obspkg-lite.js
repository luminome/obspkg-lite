import * as THREE from 'three/build/three.module.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import {vars} from "./vars-lite";
import {dragControls} from './drags.js';
import {keyControls} from './keys.js';
import * as util from './obspkg-lite-util.js';
import {loader as fetchAll} from './data-loader.js';
import {norm_val} from "./obspkg-lite-util.js";
// import {Line2} from 'three/examples/jsm/lines/Line2.js';
// import {LineMaterial} from "three/examples/jsm/lines/LineMaterial";
// import {LineGeometry} from "three/examples/jsm/lines/LineGeometry";

vars.data = {};

vars.info = {
    world_position: new THREE.Vector3(),
    screen_position: {
        a: new THREE.Vector2(),
        b: new THREE.Vector2(),
    },
    dom_element: null,
    text: 'null',
    rect: null,
    init: function () {
        this.dom_element = document.getElementById('info-field');
        this.dom_element.querySelector('.info-head').innerHTML = this.text.toString();
        this.rect = this.dom_element.getBoundingClientRect();
    },
    hover: function (e) {
        this.style.color = '#FFFFFF';
    },
    set_label_color: function (c) {
        this.dom_element.style.color = c;
    },
    set_position: function (x, y) {
        let nx = (vars.view.width / 2) - x;
        let ny = (vars.view.height / 2) - y;
        let mod = 0.8;
        let x_offset = (Math.abs(nx) > (vars.view.width / 2) * mod) ? ((vars.view.width / 2) / Math.abs(nx)) * mod : 1;
        let y_offset = (Math.abs(ny) > (vars.view.height / 2) * mod) ? ((vars.view.height / 2) / Math.abs(ny)) * mod : 1;

        if (x_offset !== 1 || y_offset !== 1) {
            this.screen_position.a.set((vars.view.width / 2) - (nx * x_offset), (vars.view.height / 2) - (ny * y_offset));
        } else {
            this.screen_position.a.set(x, y);
        }
    },
    set_state: function (bool) {
        this.dom_element.style.display = bool ? 'block' : 'none';
    },
    set_text: function (a = null, b = null) {
        [['.info-head', a], ['.info-body', b]].forEach(t => {
            if (t[1]) this.dom_element.querySelector(t[0]).innerHTML = Array.isArray(t[1]) ? t[1].join('</br>') : t[1].toString();
            this.dom_element.querySelector(t[0]).style.display = t[1] ? 'block' : 'none';
        });
        this.rect = this.dom_element.getBoundingClientRect();
    },
    update_position: function () {
        this.screen_position.b.lerp(this.screen_position.a, 0.3);
        this.dom_element.style.left = (this.screen_position.b.x - (this.rect.width / 2)).toFixed(2) + 'px';
        this.dom_element.style.top = (this.screen_position.b.y - (this.rect.height / 2)).toFixed(2) + 'px';
    },
}
vars.info.init();


const coords_from_array = (array, add_z= 0.0) => {
    const build_coords = (coords_flat) => {
        let buffer = [];
        for(let i = 0; i < coords_flat.length; i+=2){
            buffer.push(coords_flat[i], coords_flat[i+1], add_z);
        }
        return buffer;
    }

    let coords = [];
    for(let a of array){
        if(a.length === 1){
            coords.push(build_coords(a[0]));
        }else{
            for(let b of a){
                //console.log(b.some(r => r.length === 1), b);
                coords.push(build_coords(b));
            }
        }
    }
    return coords;
}

class Sector {
    constructor(id, loc, bounds) {
        this.id = id;
        this.name = `Sector-${id}`;
        this.path = `${vars.static_path}/${vars.degree_scale_str}/${this.name}`;
        this.loc = loc;
        this.bounds = bounds;
        this.level = 0;
        this.center = new THREE.Vector3();
        this.group = new THREE.Group();
        this.objects = {};
        this.enabled = vars.sector_draw ? vars.layers.allow : [];
        this.meta = null;
        this.init();
    }

    draw(object){

        if(object.name === 'line_strings'){
            const mat = new THREE[vars.mats.line_strings.type](vars.mats.line_strings.dict);
            const lines_group = new THREE.Group();
            const coord_arrays = coords_from_array(object.raw);

            for(let vertices of coord_arrays){
                const geometry = new THREE.BufferGeometry();
                geometry.setAttribute( 'position', new THREE.BufferAttribute( Float32Array.from(vertices), 3 ) );
                const contour = new THREE.Line(geometry, mat);
                lines_group.add(contour);
            }
            //lines_group.name = 'line_strings';
            lines_group.userData.level = object.level;
            this.group.add(lines_group);
        }

        if(object.name === 'contours'){
            const mat = new THREE[vars.mats.contours.type](vars.mats.contours.dict);
            object.raw.map(obj => {
                const contour_depth = new THREE.Group();
                const coord_arrays = coords_from_array(obj['line_strings'], obj['d']/-vars.depth_max);
                for(let vertices of coord_arrays){
                    const geometry = new THREE.BufferGeometry();
                    geometry.setAttribute( 'position', new THREE.BufferAttribute( Float32Array.from(vertices), 3 ) );
                    const contour = new THREE.Line(geometry, mat);
                    contour_depth.add(contour);
                }

                contour_depth.name = 'contours';
                contour_depth.userData.depth = obj['d'];
                contour_depth.userData.level = object.level;
                this.group.add(contour_depth);
            });
        }
    }

    self_destruct(){
        //console.log('removed', this.name);
        this.group.removeFromParent();
        delete this;
    }

    load_meta(obj_list){
        this.meta = obj_list[0].raw; //only one here


        Object.entries(this.meta)
            .map((k) => {
                if(k[1].length){
                    this.meta[k[0]] = k[1].reduce((a, v) => ({ ...a, [v]: null}), {});
                }else{
                    delete this.meta[k[0]];
                }
            });

        const recap = Object.keys(this.meta);//.map(m => );
        if((recap.length === 1 && recap[0] === 'polygons') || !recap.length) this.self_destruct();

        return true;
    }

    load_layers(obj_list){
        for(let obj of obj_list){
            this.meta[obj.name][obj.level] = 'loaded';
            this.draw(obj);
        }
    }

    check_layers(){
        const required = Object.entries(this.meta).filter(k => k[1].hasOwnProperty(this.level) && k[1][this.level] === null && this.enabled.includes(k[0]));
        if(required.length){
            const objects_list = required.map(k => ({url: `${this.path}/${k[0]}-${this.level}.json`, type: 'json', name: k[0], level: this.level}) );
            //console.log(this.name, objects_list);
            fetchAll(objects_list).then(object_list => this.load_layers(object_list));
        }
        // const objects_list = this.get_src(this.level);
        // if(objects_list.length) fetchAll(objects_list).then(object_list => this.load_layers(object_list));
    }

    init(){
        const material = new THREE.LineBasicMaterial({color: 0xff00ff, transparent: true, opacity:0.0});
        const geometry = new THREE.BufferGeometry().setFromPoints(this.bounds);
        geometry.setIndex([0, 1, 2, 2, 3, 0]);
        geometry.computeVertexNormals();
		geometry.computeBoundingBox();
		geometry.boundingBox.getCenter(this.center);

        const plane_line = new THREE.Line(geometry, material);
        plane_line.name = this.id+`(${this.loc.toString()})`;
        plane_line.userData.center = this.center;

        this.group.add(plane_line);
        this.group.userData.owner = this;
        this.objects.plane = plane_line;

        const meta_json = [{url: `${this.path}/meta.json`, type: 'json', name: 'meta'}]
        fetchAll(meta_json)
            .then(object_list => this.load_meta(object_list))
            .then(state => {
                if (state) {
                    this.level = 0;
                    this.check_layers();//request_layers(this.level);
                }else{
                    console.log(`Error loading ${this.name} meta-data: ${meta_json[0].url}`);
                }
            });
    }

    set_level(LV=null){
        //return false;
        if(this.level !== LV){
            this.level = LV;
            //this.objects.plane.material.setValues({opacity:(this.level/vars.levels)*0.5});
            this.objects.plane.name = `${this.id}-(${this.level})`;//(<pre>${JSON.stringify(this.meta)}</pre>)`;
            this.objects.plane.userData.level = this.level;
            this.check_layers();
            this.update();
        }
    }

    update(){
        this.group.children.forEach(res => res.visible = (res.userData.level === this.level));
    }

}

vars.user.mouse.raw = new THREE.Vector3();

let ww, wh, camera, scene, renderer, stats, gridHelper, cube;
let map_container, map_plane, visible_dimensions, camera_distance, root_plane, pos_mark_1, pos_mark_2, pos_mark_3, pos_mark_4,
    arrow_helper, grid_lines, grid_resolution, map_sectors_group, wudi_instances;
let cam_dot_y, cam_dot_x, cam_dot_z;
let active_keys = [];
let axis_planes = [];
let pos_marks_array = [];
let ticks = {};

const z_mants = [0.25, 0.5, 1.0, 2.0, 5.0, 10.0, 20.0];
let default_z = 10;
let reset_default_z = 0.0;

const cube_box = new THREE.BoxGeometry(2, 2, 2);
cube = new THREE.Mesh(cube_box, new THREE.MeshStandardMaterial({color: 0xffffff}));
cube.rotateX(Math.PI / -2);
cube.updateMatrix();
cube.userData.originalMatrix = cube.matrix.clone();

const instance_dummy = new THREE.Object3D();

const ray_caster = new THREE.Raycaster();
const cam_base_pos = new THREE.Vector3(0, 0, default_z);
const cam_pos = new THREE.Vector3(0, 0, 0);
const vk = new THREE.Vector3(0, 0, 0);
const vw = new THREE.Vector3(0, 0, 0);
const vu = new THREE.Vector3(0, 0, 0);
const vc = new THREE.Vector3(0, 0, 0);

const mu = new THREE.Matrix4();
mu.matrixWorldNeedsUpdate = true;

const qu = new THREE.Quaternion();


const y_up = new THREE.Vector3(0, 1, 0);
const x_right = new THREE.Vector3(1, 0, 0);
const z_in = new THREE.Vector3(0, 0, 1);
const cam_right = new THREE.Vector3();
const mouse_plane_pos = new THREE.Vector3(0, 0, 0);
const mouse_pos_map = new THREE.Vector3(0, 0, 0);

const user_position = new THREE.Vector3(0, 0, 0);
const user_position_round = new THREE.Vector3(0, 0, 0);
const mouseDownCameraPosition = new THREE.Vector3();
const lastMouseDown = new THREE.Vector3();
const newMouseDown = new THREE.Vector3();
const m_ray_origin = new THREE.Vector3();
const m_ray_pos = new THREE.Vector3();
const m_ray_dir = new THREE.Vector3();

const camera_frustum = new THREE.Frustum();
const camera_frustum_m = new THREE.Matrix4();
const axis_markers_count = 15;

const plot = document.getElementById('plot');
const obs = document.getElementById('obs');
const title = document.getElementById('title');

const array_to_xy = (arr) => {
    let points2 = [];
    let points3 = [];
    let x = [];
    let y = [];
    for (let i = 0; i < arr.length; i += 2) {
        x.push(arr[i]);
        y.push(arr[i + 1]);
        points2.push(new THREE.Vector2(arr[i], arr[i + 1]));
        points3.push(new THREE.Vector3(arr[i], arr[i + 1], 0.0));
    }
    return {points2: points2, points3: points3, x: x, y: y};
}

const point_in_poly = (poly_obj, point) => {
    //#//poly is special
    let x = point.x;
    let y = point.y;
    let j = poly_obj.userData.x_coords.length - 1;
    let odd = false;

    let pX = poly_obj.userData.x_coords;
    let pY = poly_obj.userData.y_coords;

    for (let i = 0; i < poly_obj.userData.x_coords.length; i++) {
        if ((pY[i] < y && pY[j] >= y || pY[j] < y && pY[i] >= y) && (pX[i] <= x || pX[j] <= x)) {
            odd ^= (pX[i] + (y - pY[i]) * (pX[j] - pX[i]) / (pY[j] - pY[i])) < x;
        }
        j = i;
    }
    return odd;
}

const projected = (v) => {
    v.project(camera);
    v.setX((v.x + 1) * (vars.view.width / 2));
    v.setY((v.y - 1) * (vars.view.height / -2));
}

const visibleAtZDepth = (depth, camera) => {
    // compensate for cameras not positioned at z=0
    const cameraOffset = camera.position.z;
    if (depth < cameraOffset) depth -= cameraOffset;
    else depth += cameraOffset;

    // vertical fov in radians
    const vFOV = camera.fov * Math.PI / 180;

    // Math.abs to ensure the result is always positive
    const vis_ht = 2 * Math.tan(vFOV / 2) * Math.abs(depth);
    return {'h': vis_ht, 'w': vis_ht * camera.aspect};
};

function obs_handler(obj) {
    let lex = Object.entries(obj).map(e => `${e[0]}: ${e[1]}`);
    obs.innerHTML = lex.join('</br>');
}

function make_map_container(bounds) {
    const container = new THREE.Group();
    const map_min = new THREE.Vector2(bounds[0], bounds[1]);
    const map_max = new THREE.Vector2(bounds[2], bounds[3]);
    const map_dims = new THREE.Vector2();
    const map_center = new THREE.Vector2();

    const map_box = new THREE.Box2(map_min, map_max);
    map_box.getSize(map_dims);
    map_box.getCenter(map_center);


    const geometry = new THREE.PlaneGeometry(map_dims.x, map_dims.y, 1, 1);
    const material = new THREE.MeshBasicMaterial({color: 0x36332D, side: THREE.DoubleSide});
    map_plane = new THREE.Mesh(geometry, material);
    container.rotateX(Math.PI / -2);
    container.position.set(-map_center.x, -0.01, map_center.y);
    container.add(map_plane);
    vars.map.offset = {
        x: map_center.x,
        y: map_center.y
    }
    vars.map.dims = {
        w: map_dims.x,
        h: map_dims.y
    }

    // console.log(vars.map);
    map_plane.position.set(vars.map.offset.x, vars.map.offset.y, 0.0);

    //

    return container;
}

function make_markers_divs() {
    const marks = [];
    for (let i = 0; i < axis_markers_count; i++) {
        const mark = document.createElement('div');
        mark.classList.add('dmark');
        mark.innerHTML = '0.0';
        document.body.appendChild(mark);
        marks.push(mark);
    }
    return marks;
}

function make_grid_lines() {
    const size = 600;
    const points = [];
    points.push(new THREE.Vector3(-size, 0, 0));
    points.push(new THREE.Vector3(size, 0, 0));
    points.push(new THREE.Vector3(0, 0, -size));
    points.push(new THREE.Vector3(0, 0, size));

    const material = new THREE.LineBasicMaterial({
        color: 0x0000ff
    });

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    return new THREE.LineSegments(geometry, material);
}

function make_markers_group() {
    const markers_group = new THREE.Group();
    const mat = new THREE[vars.mats.mapMarkersMaterial.type](vars.mats.mapMarkersMaterial.dict);
    mat.setValues({'side': THREE[vars.mats.mapMarkersMaterial.dict.side]});

    for (let n = 0; n < axis_markers_count; n++) {
        const v = new Float32Array(18);
        let int = (Math.PI * 2) / 6;
        for (let i = 0; i < v.length; i += 3) {
            v[i] = Math.cos((i / 3) * int);
            v[i + 1] = Math.sin((i / 3) * int);
            v[i + 2] = 0.0;
        }
        const a_geometry = new THREE.BufferGeometry();
        a_geometry.setAttribute('position', new THREE.BufferAttribute(v, 3));
        a_geometry.setIndex([0, 1, 2, 2, 3, 0, 3, 4, 5, 5, 0, 3]);

        //const mat = new THREE[vars.materials.mapMarkersMaterial.type](vars.materials.mapMarkersMaterial.dict);
        //const mat = MATS.mapMarkersMaterial;
        //

        //console.log(mat);
        const hexagon = new THREE.Mesh(a_geometry, mat);
        hexagon.rotateX(Math.PI / -2);
        hexagon.scale.set(0.050, 0.050, 0.050);
        markers_group.add(hexagon);
    }
    return markers_group;
}

function make_position_mark(radius) {
    const curve = new THREE.EllipseCurve(
        0, 0,            // ax, aY
        radius, radius,           // xRadius, yRadius
        0, 2 * Math.PI,  // aStartAngle, aEndAngle
        true,            // aClockwise
        0                 // aRotation
    );

    curve.updateArcLengths();

    const points = curve.getPoints(201);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    const material = new THREE.LineDashedMaterial({
        color: 0x00FF00,
        linewidth: 1,
        scale: 1,
        dashSize: radius * 0.1,
        gapSize: radius * 0.1,
    });

    // Create the final object to add to the scene
    const line = new THREE.Line(geometry, material);
    line.userData.radius = radius;
    line.computeLineDistances();
    line.rotateX(Math.PI / 2);
    return line;
}

function rayIntersectionWithXZPlane(rayOrigin, rayDirection, planeY) {
    const ySlope = (planeY - rayOrigin.y) / rayDirection.y;
    const xIntersect = rayDirection.x * ySlope + rayOrigin.x;
    const zIntersect = rayDirection.z * ySlope + rayOrigin.z;
    return new THREE.Vector3(xIntersect, planeY, zIntersect);
}

function adaptive_scaling_wudi(){
    const wudi = scene.getObjectByName('wudi');
    if(wudi && wudi.children.length) {
        //insane re-normalization technique MAYBE
        const shred = wudi.children[0].userData.td.position.reduce((st, p, n) => {
            vw.fromArray(p);
            map_container.localToWorld(vw);
            if (camera_frustum.containsPoint(vw)) {
                st.index.push(n);
                st.samp.push(wudi.children[0].userData.td.sample_raw[n]);
            }
            return st;
        }, {index: [], samp: []});

        const shred_lim = [Math.min(...shred.samp), Math.max(...shred.samp)]
        shred.index.map((s,i) => {
            const si = +(shred.samp[i] > 0);
            const index = wudi.children[si+1].userData.td.indices.indexOf(s);
            if (index !== -1) {
                wudi.children[si+1].getMatrixAt(index, mu);
                mu.decompose(vw,qu,vu);
                vu.setZ((shred.samp[i]/shred_lim[si])*vars.bar_scale);
                mu.compose(vw,qu,vu);
                wudi.children[si+1].setMatrixAt(index, mu);
                //return [s, index, si, shred_lim[si], shred.samp[i], vu]
            }
        });
        wudi.children[1].instanceMatrix.needsUpdate = true;
        wudi.children[2].instanceMatrix.needsUpdate = true;
    }
}

function translateAction(type, actual_xy, delta_xy, object) {
    vars.user.mouse.state = type;
    let dx = actual_xy[0];
    let dy = actual_xy[1];
    obs_handler({});

    vars.user.mouse.raw.x = (dx / vars.view.width) * 2 - 1;
    vars.user.mouse.raw.y = -(dy / vars.view.height) * 2 + 1;
    document.body.style.cursor = 'pointer';

    m_ray_origin.copy(new THREE.Vector3(vars.user.mouse.raw.x, vars.user.mouse.raw.y, 0.0)).unproject(camera);
    m_ray_pos.copy(new THREE.Vector3(vars.user.mouse.raw.x, vars.user.mouse.raw.y, 1.0)).unproject(camera);
    m_ray_dir.copy(m_ray_pos.sub(m_ray_origin));

    if (type === 'down') {
        lastMouseDown.copy(rayIntersectionWithXZPlane(m_ray_origin, m_ray_dir, 0.0));
        mouseDownCameraPosition.copy(user_position);
    }

    if (type === 'drag') {
        document.body.style.cursor = 'all-scroll';
        if (active_keys.includes('MetaRight')) {
            //object is cube
            object.rotateOnWorldAxis(y_up, delta_xy[0] / 100);
            object.rotateX(delta_xy[1] / 100);
            object.updateMatrixWorld();
        } else {
            newMouseDown.copy(rayIntersectionWithXZPlane(m_ray_origin, m_ray_dir, 0.0));
            user_position.copy(mouseDownCameraPosition.sub(newMouseDown.sub(lastMouseDown)));
        }
    }

    if (type === 'zoom') {
        document.body.style.cursor = 'n-resize';
        if (cam_base_pos.z < vars.min_zoom) {
            cam_base_pos.z = vars.min_zoom;
        } else {
            const zoom_factor = 1 + (delta_xy[0] / 200);
            cam_base_pos.multiplyScalar(zoom_factor);
            vk.subVectors(mouse_plane_pos, user_position);
            user_position.add(vk.multiplyScalar((1 - zoom_factor)));
        }
    }

    if (type === 'clicked') {
        vars.user.mouse.clicked = true;
    }

    if (type === 'move') {
        const eco_regions = scene.getObjectByName('eco_regions');

        if (eco_regions && eco_regions.children.length) {
            const eco = eco_regions.children.filter(e => e.geometry.boundingBox.containsPoint(mouse_pos_map))
                .filter(e => point_in_poly(e, mouse_pos_map))

            if (eco.length) {
                vars.info.set_state(true);
                const poly = eco[0];
                poly.geometry.boundingBox.getCenter(vw);
                map_container.localToWorld(vw);
                projected(vw);
                vars.info.set_position(vw.x, vw.y);
                const data = vars.data[poly.userData.data.name].raw[poly.userData.data.index];
                vars.info.set_text(data[2], `id:${data[0]}`);

                // if (vars.user.selection && poly.id !== vars.user.selection) {
                //     // scene.getObjectById(vars.user.selection, true).userData.selected(false);
                //     //
                //     // poly.userData.selected(true);
                //     // vars.info.set_state(true);
                //     poly.geometry.boundingBox.getCenter(vw);
                //     map_container.localToWorld(vw);
                //     projected(vw);
                //     vars.info.set_position(vw.x, vw.y);
                //
                //     //vars.info.set_label_color('#' + poly.material.color.getHexString());
                //     const data = vars.data[poly.userData.data.name].raw[poly.userData.data.index];
                //     vars.info.set_text(data[2], `id:${data[0]}`);
                // }
                // vars.user.selection = poly.id;
                // } else {
                //     if (vars.user.selection) scene.getObjectById(vars.user.selection, true).userData.selected(false);
                //     vars.user.selection = null;
                //     vars.info.set_state(false);
                // }
            }

            obs_handler({
                E: vars.user.selection,
                M: mouse_pos_map.toArray().map(e => e.toFixed(2)).join(', '),
            });
        }

        //basic touches
        ray_caster.setFromCamera(vars.user.mouse.raw, camera);
        const intersects = ray_caster.intersectObjects(scene.children, true).filter(i => i.object.name !== '');
        let selection = [...new Set(intersects.map((e, i) => i))]; //.map(e => e.object.name + '-' + e.instanceId + '-' + e.object.userData.td.indices[e.instanceId]))]
        selection = selection.map(i => {
            let ham = '-';
            if (intersects[i].object.userData.hasOwnProperty('td') && intersects[i].object.userData.td.hasOwnProperty('indices')) {
                ham += intersects[i].object.userData.td.indices[intersects[i].instanceId];
            } else {
                ham += intersects[i].instanceId;
            }
            return intersects[i].object.name + '-' + intersects[i].object.id + ham;
        });

        obs_handler(
            {
                IN: selection.join('</br>')
            });
    }

    //#// adaptive scaling of wudi data:
    if (type !== 'move') {
        adaptive_scaling_wudi();
        vars.info.set_state(false);
    }

    const camera_scale = 1-(camera_distance/reset_default_z);
    map_sectors_group.children.forEach(s => {
        vw.copy(s.userData.owner.objects.plane.userData.center);
        map_sectors_group.localToWorld(vw);
        root_plane.projectPoint(camera.position, vu);
        vk.subVectors(user_position, vu).multiplyScalar(0.5/vars.degree_scale);
        pos_mark_1.position.copy(vk.add(user_position));
        const L = vw.distanceTo(vk);
        if(L < (vars.levels*(vars.degree_scale))+2){
            let LV = Math.round((vars.levels - Math.round(L/vars.degree_scale))*(Math.round(camera_scale*vars.levels)/vars.levels));
            if(LV > 4) LV = 4;
            if(LV < 0) LV = 0;
            s.userData.owner.set_level(LV);
        }
    });

    if (active_keys.includes('Tab')) {
        obs_handler({
            cZ: camera_distance.toFixed(2),
            UD: mouse_plane_pos.toArray().map(e => e.toFixed(2)).join(', '),
            SW: visible_dimensions.w.toFixed(2),
            SH: visible_dimensions.h.toFixed(2),
            DY: cam_dot_y.toFixed(2),
            DX: cam_dot_x.toFixed(2),
            DZ: cam_dot_z.toFixed(2),
            UR: user_position_round.toArray().map(e => e.toFixed(2)).join(', '),
            UM: mouse_pos_map.toArray().map(e => e.toFixed(2)).join(', '),
            GR: grid_resolution,
            AS: (camera_distance / visible_dimensions.w).toFixed(2),
            AF: camera_scale.toFixed(2),
            AC: cam_base_pos.z.toFixed(2),
        });
    }

    run_camera();
    let zg = Math.floor(Math.log(camera_distance)) + 1;
    grid_resolution = z_mants[zg];
    run_ticks();

    ray_caster.setFromCamera(vars.user.mouse.raw, camera);
    ray_caster.ray.intersectPlane(root_plane, vk);
    mouse_plane_pos.set(vk.x, vk.y, vk.z);
    mouse_pos_map.set(mouse_plane_pos.x + vars.map.offset.x, Math.abs(mouse_plane_pos.z - vars.map.offset.y), 0.0);

    pos_mark_4.position.copy(mouse_plane_pos);
    grid_lines.position.copy(mouse_plane_pos);
}

function keyAction(raw) {
    active_keys = raw;
    // console.log(active_keys);
    if (raw.includes('Space')) {
        cam_base_pos.set(0, 0, 10);
        cam_pos.set(0, 0, 0);
        user_position.set(0, 0, 0);
        cube.userData.originalMatrix.decompose(cube.position, cube.quaternion, cube.scale);
        cube.matrix.copy(cube.userData.originalMatrix);
        run_camera();
        run_ticks();
    }

}

function run_camera() {
    cam_pos.copy(cam_base_pos.clone().applyQuaternion(cube.quaternion));
    //cam_pos.lerp(cam_base_pos.clone().applyQuaternion(cube.quaternion), 0.1);
    camera.up.copy(y_up.clone().applyQuaternion(cube.quaternion));
    //camera.up.lerp(y_up.clone().applyQuaternion(cube.quaternion), 0.1);
    camera.position.addVectors(cam_pos, user_position);
    camera.lookAt(user_position);
    camera.updateMatrix();
    camera.updateMatrixWorld();
    camera_frustum.setFromProjectionMatrix(camera_frustum_m.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));

    camera.getWorldDirection(vu);
    cam_right.crossVectors(vu, camera.up);

    cam_dot_y = camera.up.dot(root_plane.normal);
    cam_dot_x = cam_right.dot(x_right);
    cam_dot_z = z_in.dot(vu);

    vw.subVectors(camera.position, user_position);
    camera_distance = vw.length();

    for (let plane of axis_planes) {
        vk.copy(plane.position);
        vk.unproject(camera);

        plane.plane.set(vw.negate(), 0);
        vu.subVectors(vk, camera.position).normalize();
        ray_caster.set(camera.position, vu);

        ray_caster.ray.intersectPlane(root_plane, vw);
        vc.subVectors(user_position, vw);

        if (plane.name === 'x') {
            plane.plane.set(vc, 0);
            //plane.up.crossVectors(vw, vc);
        } else {
            //crucial bit of kung-fu
            plane.plane.set(camera_frustum.planes[1].normal, 0);
            //plane.up.copy(camera_frustum.planes[5].normal);
        }

        plane.plane.translate(vw);
        //plane.mark.position.set(vw.x, vw.y, vw.z);
    }

    vars.user.group.position.copy(user_position);
    user_position_round.copy(user_position).round();//.multiplyScalar(vars.degree_scale);
    grid_lines.position.copy(user_position);
    pos_mark_2.position.copy(user_position_round);

    //visible_dimensions = visibleAtZDepth(-camera_distance, camera);
}

function run_ticks() {
    for (let plane of axis_planes) {
        ticks.card = plane.name === 'x' ? 'E' : 'N';
        for (let m = 0; m < axis_markers_count; m++) {
            plane.markers_geoms.children[m].position.set(0, 1, 0);

            if (plane.name === 'x') {
                ticks.n = Math.round((user_position_round.x) / grid_resolution) * grid_resolution + ((m - ((axis_markers_count - 1) / 2)) * grid_resolution);
                vw.set(ticks.n, 0, 0);
                vk.set(0, 0, Math.sign(cam_dot_x)).normalize();
            } else {
                ticks.n = Math.round((user_position_round.z) / grid_resolution) * grid_resolution + ((m - ((axis_markers_count - 1) / 2)) * grid_resolution);
                vw.set(0, 0, ticks.n);
                vk.set(Math.sign(cam_dot_z), 0, 0).normalize();
            }
            ray_caster.set(vw, vk);
            ticks.res = ray_caster.ray.intersectPlane(plane.plane, vu);
            plane.markers_divs[m].style.visibility = ticks.res === null ? 'hidden' : 'visible';

            if (ticks.res !== null) {

                projected(vu);

                ticks.offset = ticks.card === 'E' ? vars.map.offset.x : -vars.map.offset.y;
                plane.markers_divs[m].innerHTML = `${(ticks.n + ticks.offset).toFixed(grid_resolution < 1 ? 2 : 0)}º ${ticks.card}`;
                ticks.rect = plane.markers_divs[m].getBoundingClientRect();
                if (plane.name === 'x') {
                    ticks.left = (vu.x - (ticks.rect.width / 2)) + 'px';
                    ticks.top = (vars.view.height - (ticks.rect.height / 2)) + 'px';
                } else {
                    ticks.left = 0;
                    ticks.top = (vu.y - (ticks.rect.height / 2)) + 'px';
                }
                plane.markers_divs[m].style.left = ticks.left;
                plane.markers_divs[m].style.top = ticks.top;
            }
        }
    }
}

function animate() {
    requestAnimationFrame(animate);
    vars.info.update_position();
    render();
    stats.update();
}

function render() {
    //#//yes yer doing it.
    renderer.render(scene, camera);
}

function windowRedraw() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    ww = w;
    wh = h - vars.view.bottom_offset;
    plot.style.width = (w) + 'px';
    plot.style.height = (h - vars.view.bottom_offset) + 'px';
    vars.view.width = ww;
    vars.view.height = wh;

    if (camera) {
        camera.aspect = ww / wh;
        camera.updateProjectionMatrix();
        renderer.setSize(ww, wh);
    }

    title.style.bottom = '20px';
}

function draw_sectors() {

    vars.map.deg = vars.degree_scale;
    vars.map.sectors = (vars.map.dims.w * (1 / vars.map.deg)) * (vars.map.dims.h * (1 / vars.map.deg));
    console.log('total sectors:', vars.map.sectors);

    console.log("vars.map", vars.map);

    for (let i = 0; i < vars.map.sectors; i++) {
        let x = i % (vars.map.dims.w * (1 / vars.map.deg));
        let y = Math.floor(i / (vars.map.dims.w * (1 / vars.map.deg)));
        let sx = vars.map.test_bounds[0] + (x * vars.map.deg);
        let sy = (vars.map.test_bounds[3]-vars.map.deg) - (y * vars.map.deg);
        vw.set(sx, sy+vars.map.deg, 0.0);

        let tile_vertices = [
            vw.clone(),
            vw.clone().setY(vw.y - vars.map.deg),
            vw.clone().setX(vw.x + vars.map.deg).setY(vw.y - vars.map.deg),
            vw.clone().setX(vw.x + vars.map.deg)
        ]

        let loc = [sx, sy];
        const new_tile = new Sector(i, loc, tile_vertices);
        map_sectors_group.add(new_tile.group);
    }

}

function draw_data_instanced(instances_group) {
    const color = new THREE.Color();
    for (let instance of instances_group.children) {
        if (instance) {
            for (let i = 0; i < instance.userData.td.len; i++) {
                vw.fromArray(instance.userData.td.position[i]);
                instance_dummy.scale.setScalar(1.0);
                instance_dummy.position.copy(vw);
                if (instance.userData.type === 'scaled_point') {
                    instance_dummy.scale.x = instance.userData.td.sample_raw[i];
                    instance_dummy.scale.y = instance.userData.td.sample_raw[i];
                }
                if (instance.userData.type === 'bar') {
                    instance_dummy.rotation.z = instance.userData.td.rotation[i];
                    instance_dummy.scale.x = instance.userData.td.scale[i];
                    instance_dummy.scale.z = Math.sign(instance.userData.td.sample[i]);
                }
                instance_dummy.updateMatrix();
                color.fromArray(instance.userData.td.color[i], 0);
                instance.setMatrixAt(i, instance_dummy.matrix);
                instance.setColorAt(i, color.clone());
            }
            instance.instanceMatrix.needsUpdate = true;
            instance.instanceColor.needsUpdate = true;
            console.log(instance.name, "instance", instance);
        }
    }
}

function plot_data(obj) {
    const keys = vars.data[obj.name].raw[0];
    console.log(keys.map((k, i) => {
        return `${i}:${k}`
    }));
    let group;
    let is_instance = false;

    console.log('object:', obj);
    if (obj.style === 'point') {
        is_instance = true;
        let samples = [];
        let instances = [];
        group = new THREE.Group();
        group.name = obj.name;

        const datum = {
            len: vars.data[obj.name].raw.length - 1,
            color: [],
            position: [],
            sample_normal: [],
            sample_raw: []
        }

        for (let i = 1; i < vars.data[obj.name].raw.length; i++) {
            if (obj.name === 'wudi') {
                samples.push(vars.data[obj.name].raw[i][8]);
                datum.position.push([vars.data[obj.name].raw[i][obj.geom_index[0]], vars.data[obj.name].raw[i][obj.geom_index[1]], 0.0]);
            } else {
                datum.color.push([0.0, 1.0, 1.0]);
                datum.position.push([vars.data[obj.name].raw[i][obj.geom_index][0], vars.data[obj.name].raw[i][obj.geom_index][1], 0.0]);
            }
        }

        const limits = util.max_min(samples.filter(s => s !== null && s.toString() !== 'null'));

        if (obj.name === 'wudi') {
            let r, b, o = 0.1, l = 0.5;
            for (let s of samples) {
                if (!s) {
                    datum.color.push([0.0, 0.0, 0.0]);
                    datum.sample_normal.push(0.01);
                    datum.sample_raw.push(0.0);
                } else {
                    r = s > 0 ? util.norm_val(s, l, limits.max) + l : o;
                    b = s < 0 ? util.norm_val(Math.abs(s), l, Math.abs(limits.min)) + l : o;
                    datum.color.push([r, o, b]);
                    datum.sample_normal.push(s > 0 ? s / limits.max : -s / limits.min);
                    datum.sample_raw.push(s);
                }
            }
        }

        if (obj.name === 'protected_no_geom') {
            const areas = obj.raw.reduce((sv,e,i) => {
                if(i>0 && e[6]!==null){
                    sv[0].push(e[6]);
                    sv[1] += e[6];
                }
                datum.sample_raw.push(1.0);
                return sv;
            },[[],0.0]);
            const max_area = Math.max(...areas[0]);
            const min_area = Math.min(...areas[0]);
            const avg_area = areas[1]/areas[0].length;
            console.log(avg_area, min_area, max_area, areas);

            const set_size = obj.raw.map((e,i) =>{
                if(i>0 && e[6]!==null){
                    //datum.sample_raw[i] = e[6]/avg_area;
                    //const norm = norm_val(e[6], min_area, max_area)*avg_area;
                    let norm = norm_val(e[6], min_area, avg_area);//*avg_area;
                    if( norm > 5.0 ) norm = 2.0;
                    if( norm < 0.25 ) norm = 0.25;
                    datum.sample_raw[i] = norm;/// > 5.0 ? 5.0 : norm;
                }
            })
        }

        const geometry = new THREE.CircleBufferGeometry(0.1, 12);
        geometry.deleteAttribute('uv');
        geometry.deleteAttribute('normal');
        const material = new THREE.MeshBasicMaterial({
            color: 0xFFFFFF,
            side: THREE.FrontSide,
            transparent: true,
            opacity:0.5,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });

        const instance = new THREE.InstancedMesh(geometry, material, datum.len);
        instance.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        instance.name = obj.name;
        if (obj.name === 'protected_no_geom') {
            instance.userData.type = 'scaled_point';
        }else{
            instance.userData.type = 'point';
        }

        instance.userData.td = datum;
        instances.push(instance);


        if (obj.name === 'wudi') {
            //["0:A_lat", "1:A_lon", "2:M_lat", "3:M_lon", "4:B_lat", "5:B_lon", "6:geo", "7:eco_region", "8:sample"] (9)
            // const A = new THREE.Vector3(vars.data[obj.name].raw[i][1], vars.data[obj.name].raw[i][0], 0.0);
            // const B = new THREE.Vector3(vars.data[obj.name].raw[i][5], vars.data[obj.name].raw[i][4], 0.0);
            // datum.position = [];
            // datum.rotation = [];

            const wudi_down = {
                name: 'wudi downwelling',
                len: 0,
                color: [],
                position: [],
                rotation: [],
                scale: [],
                sample: [],
                sample_raw: [],
                indices: []
            }

            const wudi_up = {
                name: 'wudi upwelling',
                len: 0,
                color: [],
                position: [],
                rotation: [],
                scale: [],
                sample: [],
                sample_raw: [],
                indices: []
            }

            const ft = [wudi_down, wudi_up];

            for (let i = 1; i < vars.data[obj.name].raw.length; i++) {
                const A = new THREE.Vector3(vars.data[obj.name].raw[i][1], vars.data[obj.name].raw[i][0], 0.0);
                const B = new THREE.Vector3(vars.data[obj.name].raw[i][5], vars.data[obj.name].raw[i][4], 0.0);
                const angle = Math.atan2(B.y - A.y, B.x - A.x);

                const s = (vars.data[obj.name].raw[i][8]) > 0;

                ft[+s].position.push([A.x, A.y, A.z]);
                ft[+s].rotation.push(angle.toFixed(5));
                ft[+s].scale.push(A.distanceTo(B));
                ft[+s].color.push(datum.color[i - 1]);
                ft[+s].sample.push(datum.sample_normal[i - 1]);
                ft[+s].sample_raw.push(datum.sample_raw[i - 1]);
                ft[+s].indices.push(i - 1);
                ft[+s].len += 1;
            }

            const bar_geometry = new THREE.BoxBufferGeometry(1, 0.025, 1);
            bar_geometry.translate(0.5, 0.0, 0.5);
            bar_geometry.deleteAttribute('uv');
            bar_geometry.deleteAttribute('normal');

            const material = new THREE.MeshBasicMaterial({
                color: 0xFFFFFF,
                side: THREE.FrontSide,
                transparent: true,
                opacity: 1.0,
                blending: THREE.AdditiveBlending, //THREE.NormalBlending, //
                depthWrite: true
            });

            for (let f of ft) {
                const instance = new THREE.InstancedMesh(bar_geometry, material, datum.len);
                instance.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
                instance.name = f.name;
                instance.userData.td = f;
                instance.userData.type = 'bar';
                instances.push(instance);
            }
        }

        for (let inst of instances) group.add(inst);

        //obj.geometry_array = datum;
        //return;
    } else {
        //#//for datasets with polygonal geometries
        //#//MAKE WORK FOR MULTIPOLYS
        group = new THREE.Group();
        group.name = obj.name;



        vars.data[obj.name].raw.forEach((l_obj, i) => {
            if (i > 0) {
                if (obj.style === 'mesh' || obj.style === 'line') {
                    let element;
                    const is_complex = vars.data[obj.name].hasOwnProperty('is_complex');
                    const geom_obj = l_obj[vars.data[obj.name].geom_index];
                    const exterior = array_to_xy(is_complex ? geom_obj.out : geom_obj);

                    if (obj.style === 'mesh') {
                        const out_points = exterior.points2;
                        const polygon_shape = new THREE.Shape(out_points);
                        if(is_complex){
                            const in_shapes = geom_obj.in.map(i => new THREE.Shape(array_to_xy(i).points2));
                            if (in_shapes.length) polygon_shape.holes = in_shapes;
                        }
                        const geometry = new THREE.ShapeBufferGeometry(polygon_shape);
                        const material = new THREE.MeshBasicMaterial({color: 0xffffff});
                        element = new THREE.Mesh(geometry, material);
                    } else if (obj.style === 'line') {
                        const geometry = new THREE.BufferGeometry().setFromPoints(exterior.points3);
                        const material = new THREE.LineBasicMaterial({color: vars.colors[obj.name].select[0]});
                        element = new THREE.Line(geometry, material);
                        element.computeLineDistances();
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

                }else if (obj.style === 'multi_line') {
                    const material = new THREE.LineBasicMaterial({color: vars.colors[obj.name].select[0]});
                    let element;
                    const batch = coords_from_array(l_obj, -100/vars.depth_max);//.flat(1);
                    for(let vertices of batch){
                        if(vertices.length > 9){
                            const geometry = new THREE.BufferGeometry();
                            geometry.setAttribute( 'position', new THREE.BufferAttribute( Float32Array.from(vertices), 3 ) );
                            element = new THREE.Line(geometry, material);
                            element.name = `${obj.name}-(${vertices.length})`;
                            element.geometry.computeBoundingBox();
                            element.userData.data = {name: obj.name, index: i};
                            group.add(element);
                        }
                    }
                }
            }
        });
    }

    map_container.add(group);
    if (is_instance) {
        draw_data_instanced(group);
    }

    adaptive_scaling_wudi();

}

function init() {
    camera = new THREE.PerspectiveCamera(45, ww / wh, 0.1, 1000);
    scene = new THREE.Scene();
    scene.background = new THREE.Color(vars.window_color);

    vars.user.group = new THREE.Group();
    map_sectors_group = new THREE.Group();

    renderer = new THREE.WebGLRenderer({
        powerPreference: "high-performance",
        antialias: true
    });

    renderer.setPixelRatio(1);//window.devicePixelRatio);//(2)
    renderer.setSize(ww, wh);

    root_plane = new THREE.Plane(y_up);

    const col_xy = new THREE.Color("hsl(100, 0%, 35%)");
    const col_gd = new THREE.Color("hsl(100, 0%, 30%)");
    gridHelper = new THREE.GridHelper(20, 20, col_xy, col_gd);
    scene.add(gridHelper);
    gridHelper.visible = false;

    pos_mark_1 = make_position_mark(0.1);
    pos_mark_2 = make_position_mark(0.1);
    pos_mark_3 = make_position_mark(0.5);
    pos_mark_4 = make_position_mark(0.5);

    //#//POSMARKS
    pos_marks_array = [pos_mark_1, pos_mark_2, pos_mark_3, pos_mark_4];
    pos_marks_array.forEach(p => {
        scene.add(p);
        p.visible = vars.position_marks_visible;
    });

    arrow_helper = new THREE.ArrowHelper(vw, vk, 1, 0xffff00, 0.3, 0.3);

    axis_planes.push({
        name: 'x',
        plane: new THREE.Plane(),
        position: new THREE.Vector3(0, -1, 0),
        up: new THREE.Vector3(),
        mark: make_position_mark(1.0),
        markers_geoms: make_markers_group(),
        markers_divs: make_markers_divs()
    })

    axis_planes.push({
        name: 'y',
        plane: new THREE.Plane(),
        position: new THREE.Vector3(-1, 0, 0),
        up: new THREE.Vector3(),
        mark: make_position_mark(1.0),
        markers_geoms: make_markers_group(),
        markers_divs: make_markers_divs()
    })

    scene.add(axis_planes[0].markers_geoms);

    vars.user.group.add(pos_mark_3);
    vars.user.group.add(arrow_helper);
    arrow_helper.visible = false;

    scene.add(vars.user.group);
    //vars.user.group.visible = false;

    stats = new Stats();
    document.body.appendChild(stats.dom);

    map_container = make_map_container(vars.map.test_bounds);
    map_container.add(map_sectors_group);
    scene.add(map_container);
    map_plane.visible = false;

    dragControls(renderer.domElement, translateAction, cube, {passive: true});
    keyControls(window, keyAction);

    grid_lines = make_grid_lines();
    scene.add(grid_lines);
    plot.appendChild(renderer.domElement);

    visible_dimensions = visibleAtZDepth(-default_z, camera);
    cam_base_pos.z = ((default_z / visible_dimensions.w) * vars.map.dims.w) + 2.0;
    reset_default_z = cam_base_pos.z;

    let zg = Math.floor(Math.log(cam_base_pos.z)) + 1;
    grid_resolution = z_mants[zg];

    ray_caster.params.Line.threshold = 0.005;
    ray_caster.params.Points.threshold = 0.025;

    run_camera();
    run_ticks();

}

// 👉️ LOADERS / PARSERS
const array_auto = (str) => (new Function(`return [${str}];`)());

const array_chuk = (data, len) => {
    let ret = []
    while (data.length) {
        ret.push(data.splice(0, len))
    }
    return ret
}

const fetch_callback = (obj_list) => {
    obj_list.forEach(obj => {
        switch (obj.type) {
            case 'csv_text':
                obj.raw = array_chuk(array_auto(obj.raw), obj.columns);
                vars.data[obj.name] = obj;
                break;
            case 'json':
                vars.data[obj.name] = obj;
                break;
            default:
                console.log(`callback found no data of type ${obj.type}`);
        }

        plot_data(obj);
    });
    console.log(vars.data);
    draw_sectors();
    // do_run_test_plot('wudi', 'point');
}

// 👉️ START EVERYTHING HERE
window.addEventListener('resize', windowRedraw);
windowRedraw(null);
init();
animate();

// draw_sectors();

const obj_list = [
    {url: './data/raw-wudi-9.txt', type: 'csv_text', name: 'wudi', columns: 9, style: 'point', geom_index: [3, 2]},
    {url: './data/raw-protected-15.txt', type: 'csv_text', name: 'protected_no_geom', style: 'point', columns: 15, geom_index: 12},
    {url: './data/raw-georegions-11.txt', type: 'csv_text', name: 'eco_regions', columns: 11, style: 'line', geom_index: 10, is_complex: true},
    {url: './data/raw-isobath-100m-1.txt', type: 'csv_text', name: 'iso_bath', columns: 1, style: 'multi_line', geom_index: 0}
]

fetchAll(obj_list).then(object_list => fetch_callback(object_list));



