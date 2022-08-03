import * as THREE from 'three/build/three.module.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import {vars} from "./vars-lite";
//import {dragControls} from './drags.js';
import {dragControls} from '../../static/e5/js/drags-lite-beta.js';
import {keyControls} from './keys.js';
import * as util from './obspkg-lite-util.js';
import {loader as fetchAll} from './data-loader.js';
import {post_loader as fetchPOST} from './data-loader.js';
import {norm_val, title_case, to_lexical_range} from "./obspkg-lite-util.js";
import {graph} from "./obspkg-lite-dom-graph-util";

// import {Line2} from 'three/examples/jsm/lines/Line2.js';
// import {LineMaterial} from "three/examples/jsm/lines/LineMaterial";
// import {LineGeometry} from "three/examples/jsm/lines/LineGeometry";

document.body.style['background-color'] = vars.colors.hex_css(vars.colors.window);

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
        this.display_element = this.dom_element.querySelector('.info-body');
        this.temp_element = this.dom_element.querySelector('.info-temp');
        this.dom_element.querySelector('.info-head').innerHTML = this.text.toString();
        this.dom_element.style.backgroundColor = vars.colors.hex_css(vars.colors.window, vars.colors.info_bk_opacity);
        this.rect = this.dom_element.getBoundingClientRect();
    },
    hover: function (e) {
        this.style.color = '#FFFFFF';
    },
    set_label_color: function (c) {
        this.dom_element.style.color = c;
    },
    set_position: function (x, y, style = 'area') {
        if (style === 'area') {
            const nx = (vars.view.width / 2) - x;
            const ny = (vars.view.height / 2) - y;
            const mod = 0.8;
            const x_offset = (Math.abs(nx) > (vars.view.width / 2) * mod) ? ((vars.view.width / 2) / Math.abs(nx)) * mod : 1;
            const y_offset = (Math.abs(ny) > (vars.view.height / 2) * mod) ? ((vars.view.height / 2) / Math.abs(ny)) * mod : 1;

            if (x_offset !== 1 || y_offset !== 1) {
                this.screen_position.a.set((vars.view.width / 2) - (nx * x_offset), (vars.view.height / 2) - (ny * y_offset));
            } else {
                this.screen_position.a.set(x, y);
            }
        } else {
            //default to right center of mouse
            //const pos_x = this.rect.width
            this.screen_position.a.set(x + (this.rect.width / 2) + 10, y);
            this.screen_position.b.copy(this.screen_position.a);
        }
    },
    drag_position: function (delta_x, delta_y) {
        vw.set(delta_x, delta_y);
        this.screen_position.a.add(vw);
        this.screen_position.b.copy(this.screen_position.a);
    },
    set_state: function (bool) {
        this.dom_element.style.display = bool ? 'block' : 'none';
    },
    set_text: function (text_dict, mode = null) {
        this.display_element.innerHTML = '';
        for (let d of text_dict) {
            const part = this.temp_element.cloneNode(true);
            part.classList.remove('info-temp');
            [['.info-head', d.head], ['.info-text', d.hasOwnProperty('text') ? d.text : null]].forEach(t => {
                if (t[1]) part.querySelector(t[0]).innerHTML = Array.isArray(t[1]) ? t[1].join('</br>') : t[1].toString();
                part.querySelector(t[0]).style.display = t[1] ? 'block' : 'none';
            });
            this.display_element.appendChild(part);
        }
        this.rect = this.dom_element.getBoundingClientRect();
    },
    update_position: function () {
        this.screen_position.b.lerp(this.screen_position.a, 0.3);
        this.dom_element.style.left = (this.screen_position.b.x - (this.rect.width / 2)).toFixed(2) + 'px';
        this.dom_element.style.top = (this.screen_position.b.y - (this.rect.height / 2)).toFixed(2) + 'px';
    },
}

vars.info.init();

vars.selecta = {
    intersect: null,
    focus_obj: null,
    moved: null,
    wudi: {
        times: {years: ['all'], months: ['all'], has_default: 'all', selected: [], loaded: [], required: []},
        points: {hover: [], selected: []},
        points_in_view: [],
        times_select: function (type, element = null) {
            this.times.required = [];
            if (this.times[type].includes(this.times.has_default)) this.times[type] = [];

            if (element) {
                const pos = this.times[type].indexOf(element.data);
                if (pos === -1) {
                    this.times[type].push(element.data);
                } else {
                    this.times[type].splice(pos, 1);
                }
            }

            if (this.times[type].length === 0 && !this.times[type].includes(this.times.has_default)) {
                this.times[type].push(this.times.has_default);
            }

            for (let y of this.times.years) {
                if (y !== 'all' && this.times.months[0] === 'all') this.times.required.push(y.toString());
                for (let m of this.times.months) {
                    const month = y + String(m).padStart(2, '0');
                    if (m !== 'all') this.times.required.push(month);
                }
            }

            this.times.selected = this.times.years[0] === 'all' ? ['all'] : this.times.required;

            this.times.required = this.times.required.filter((t) => !this.times.loaded.includes(t));

            wudi_get_data(this.times.required);

            obs_handler({'T': Object.entries(this.times)});

            vars.dom_time[type].map((y) => y.set_state(this.times[type].includes(y.data)));

            if (this.times.years[0] !== 'all') {
                const years_grp = [...this.times.years];
                const months_grp = [...this.times.months];
                title.innerHTML = 'Mean daily observations of WUDI for ' + util.to_lexical_range(years_grp) + ' ' + util.to_lexical_range(months_grp, 'mo');
                document.getElementById('months_container').style.display = 'flex';
                if(vars.view.init_state) windowRedraw();
            }else{
                title.innerHTML = 'Mean daily observations of WUDI from 1979 to 2020';
                document.getElementById('months_container').style.display = 'none';
                if(vars.view.init_state) windowRedraw();
            }

        },
        point_select: function (pid) {
            const pos = this.points.selected.indexOf(pid);
            // console.log(pos);

            if (pos === -1) {
                this.points.selected.push(pid);
                //wudi_point_select_state(vars.selecta.wudi.points.hover[0], true, true);
                wudi_point_select_state(pid, true, true);

                move_map_to_point(pid);
            } else {
                this.points.selected.splice(pos, 1);
                //wudi_point_select_state(vars.selecta.wudi.points.hover[0], false, true);
                wudi_point_select_state(pid, false, true);
            }

            wudi_get_point_detail(this.points.selected);
            //obs_handler({'T':Object.entries(this.points.selected)});
        }
    },
    eco_region: {
        hover: null,
        chosen: null
    },
    protected_region: {
        hover: null,
        chosen: null
    }
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

    draw(object) {

        if (object.name === 'line_strings') {
            const mat = new THREE[vars.mats.line_strings.type](vars.mats.line_strings.dict);
            //mat.setValues({color: vars.colors.eco_regions.select[1]});
            const lines_group = new THREE.Group();
            const coord_arrays = coords_from_array(object.raw);

            for (let vertices of coord_arrays) {
                const geometry = new THREE.BufferGeometry();
                geometry.setAttribute('position', new THREE.BufferAttribute(Float32Array.from(vertices), 3));
                const contour = new THREE.Line(geometry, mat);
                lines_group.add(contour);
            }
            //lines_group.name = 'line_strings';
            lines_group.userData.level = object.level;
            this.group.add(lines_group);
        }

        if (object.name === 'contours') {
            const mat = new THREE[vars.mats.contours.type](vars.mats.contours.dict);
            object.raw.map(obj => {
                const contour_depth = new THREE.Group();
                const coord_arrays = coords_from_array(obj['line_strings'], obj['d'] / -vars.depth_max);
                for (let vertices of coord_arrays) {
                    const geometry = new THREE.BufferGeometry();
                    geometry.setAttribute('position', new THREE.BufferAttribute(Float32Array.from(vertices), 3));
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

    self_destruct() {
        //console.log('removed', this.name);
        this.group.removeFromParent();
        delete this;
    }

    load_meta(obj_list) {
        this.meta = obj_list[0].raw; //only one here


        Object.entries(this.meta)
            .map((k) => {
                if (k[1].length) {
                    this.meta[k[0]] = k[1].reduce((a, v) => ({...a, [v]: null}), {});
                } else {
                    delete this.meta[k[0]];
                }
            });

        const recap = Object.keys(this.meta);//.map(m => );
        if ((recap.length === 1 && recap[0] === 'polygons') || !recap.length) this.self_destruct();

        return true;
    }

    load_layers(obj_list) {
        for (let obj of obj_list) {
            this.meta[obj.name][obj.level] = 'loaded';
            this.draw(obj);
        }
    }

    check_layers() {
        if(this.meta){
            const required = Object.entries(this.meta).filter(k => k[1].hasOwnProperty(this.level) && k[1][this.level] === null && this.enabled.includes(k[0]));
            if (required.length) {
                const objects_list = required.map(k => ({
                    url: `${this.path}/${k[0]}-${this.level}.json`,
                    type: 'json',
                    name: k[0],
                    level: this.level
                }));
                //console.log(this.name, objects_list);
                fetchAll(objects_list, loader_notify).then(object_list => this.load_layers(object_list));
            }
        }
        // const objects_list = this.get_src(this.level);
        // if(objects_list.length) fetchAll(objects_list).then(object_list => this.load_layers(object_list));
    }

    init() {
        const material = new THREE.LineBasicMaterial({color: 0xff00ff, transparent: true, opacity: 0.0});
        const geometry = new THREE.BufferGeometry().setFromPoints(this.bounds);
        geometry.setIndex([0, 1, 2, 2, 3, 0]);
        geometry.computeVertexNormals();
        geometry.computeBoundingBox();
        geometry.boundingBox.getCenter(this.center);

        const plane_line = new THREE.Line(geometry, material);
        plane_line.name = this.id + `(${this.loc.toString()})`;
        plane_line.userData.center = this.center;

        this.group.add(plane_line);
        this.group.userData.owner = this;
        this.objects.plane = plane_line;

        const meta_json = [{url: `${this.path}/meta.json`, type: 'json', name: 'meta'}]
        fetchAll(meta_json, loader_notify)
            .then(object_list => this.load_meta(object_list))
            .then(state => {
                if (state) {
                    this.level = 0;
                    this.check_layers();//request_layers(this.level);
                } else {
                    console.log(`Error loading ${this.name} meta-data: ${meta_json[0].url}`);
                }
            });
    }

    set_level(LV = null) {
        //return false;
        if (this.level !== LV) {
            this.level = LV;
            //this.objects.plane.material.setValues({opacity:(this.level/vars.levels)*0.5});
            this.objects.plane.name = `${this.id}-(${this.level})`;//(<pre>${JSON.stringify(this.meta)}</pre>)`;
            this.objects.plane.userData.level = this.level;
            this.check_layers();
            this.update();
        }
    }

    update() {
        this.group.children.forEach(res => res.visible = (res.userData.level === this.level));
    }

}

class domTimeElement {
    constructor(id, time_type, label, data, auto_select = false) {
        this.dom_element = null;
        this.label = label;
        this.id = id;
        this.data = data;
        this.is_auto_selected = auto_select;
        this.selected = auto_select;
        this.type = time_type;
        this.init();
        this.set_state(this.selected);
    }

    init() {
        const el = document.getElementById('time_element_temp').cloneNode(true);
        this.dom_element = el;
        el.innerHTML = this.label;
        el.setAttribute('id', 'time-' + this.type + '-' + this.id);
        el.setAttribute('data-id', this.data);
        el.addEventListener('click', this.dom_select.bind(el, this));
        document.getElementById(this.type + '_container').appendChild(el);
        //if(this.is_auto_selected) el.classList.toggle('selected');
    }

    set_state(bool) {
        this.selected = bool;
        if (bool) {
            this.dom_element.classList.add('selected');
        } else {
            this.dom_element.classList.remove('selected');
        }
    }

    dom_select(bound, e) {
        obs_handler(e.target.dataset);
        vars.selecta.wudi.times_select(bound.type, bound);///engage()
    }

}

vars.dom_time = {
    years: [],
    months: [],
    populate: async function (type) {
        if (type === 'years') {
            const test_time = new domTimeElement(0, 'years', 'ALL 40 YEARS', 'all', true);
            this.years.push(test_time);
            for (let t = 1980; t < 2021; t++) {
                const label = "'" + t.toString().substr(2, 2);
                const test_time = new domTimeElement(t, 'years', label, t);
                this.years.push(test_time);
            }
            vars.selecta.wudi.times_select('years');
        } else if (type === 'months') {
            const test_time = new domTimeElement(0, 'months', 'ALL MONTHS', 'all', true);
            this.months.push(test_time);
            for (let t = 1; t < 13; t++) {
                const label = String(t).padStart(2, '0');
                const test_time = new domTimeElement(t, 'months', label, t);
                this.months.push(test_time);
            }
            vars.selecta.wudi.times_select('months');
        }
        return true;
    }
}


vars.user.mouse.raw = new THREE.Vector3(0, 0, 0);
vars.sectors_loaded = false;
vars.loader_notify = {ct: 0, list: []};

const bounds = document.getElementById('bounds');
const plot = document.getElementById('plot');
const obs = document.getElementById('obs');
const title = document.getElementById('title');
const title_box = document.getElementById('title-box');
const x_major_axis = document.getElementById('x-axis');
const y_major_axis = document.getElementById('y-axis');
const graph_bar = document.getElementById("graph-obj-bar");
const q_nav_bar = document.getElementById("q-nav-bar");

// const bars = [...document.querySelectorAll('.bar')];
// bars.map((b) => {
//     b.style.visibility = 'hidden';
// });

let camera, scene, renderer, stats, gridHelper, cube;
let map_container, map_plane, visible_dimensions, camera_distance, root_plane, pos_mark_1, pos_mark_2, pos_mark_3, pos_mark_4,
    axes_helper, arrow_helper_1, arrow_helper_2, arrow_helper_3, arrow_helper_4, grid_lines, grid_resolution, map_sectors_group, ref_marker;
let cam_dot_y, cam_dot_x, cam_dot_z, camera_scale;
let active_keys = [];
let axis_planes = [];
let pos_marks_array = [];
let ticks = {};


let ww = window.innerWidth;
let wh = window.innerHeight;

console.log(ww, wh);
// let bars_height = 0;
// const bars = [...document.querySelectorAll('.bar')];
// bars.map((b) => { if(b.style.display !== 'none') bars_height += b.getBoundingClientRect().height });
//
// q_nav_bar.style.height = vars.view.q_nav_bar_height+'px';
//
// ww = w;
// wh = (h - vars.view.bottom_buffer - bars_height);




const z_mants = [0.25, 0.5, 1.0, 2.0, 5.0, 10.0, 20.0];
let default_z = 10;
let reset_default_z = 0.0;

const cube_box = new THREE.BoxGeometry(2, 2, 2);
cube = new THREE.Mesh(cube_box, new THREE.MeshStandardMaterial({color: 0xffffff}));
cube.rotateX(Math.PI / -2);
cube.updateMatrix();
cube.userData.originalMatrix = cube.matrix.clone();

const utility_color = new THREE.Color();

const instance_dummy = new THREE.Object3D();

const display_inline_array = ['none', 'inline-block'];
const display_array = ['none', 'block'];

const ray_caster = new THREE.Raycaster();
const cam_base_pos = new THREE.Vector3(0, 0, default_z);
const cam_pos = new THREE.Vector3(0, 0, 0);
const camera_projected = new THREE.Vector3(0, 0, 0);
const vk = new THREE.Vector3(0, 0, 0);
const vw = new THREE.Vector3(0, 0, 0);
const vu = new THREE.Vector3(0, 0, 0);
const vc = new THREE.Vector3(0, 0, 0);

const axis_dir_x = new THREE.Vector3(0, 0, 1);
const axis_dir_y = new THREE.Vector3(-1, 0, 0);

const mu = new THREE.Matrix4();

const qu = new THREE.Quaternion();

const y_up = new THREE.Vector3(0, 1, 0);
const x_right = new THREE.Vector3(1, 0, 0);
const z_in = new THREE.Vector3(0, 0, 1);
const cam_right = new THREE.Vector3(0, 0, 0);
const mouse_plane_pos = new THREE.Vector3(0, 0, 0);
const mouse_pos_map = new THREE.Vector3(0, 0, 0);

const user_position = new THREE.Vector3(0, 0, 0);
const user_position_round = new THREE.Vector3(0, 0, 0);
const mouseDownCameraPosition = new THREE.Vector3(0, 0, 0);

const lastMouseDown = new THREE.Vector3(0, 0, 0);
const newMouseDown = new THREE.Vector3(0, 0, 0);
const m_ray_origin = new THREE.Vector3(0, 0, 0);
const m_ray_pos = new THREE.Vector3(0, 0, 0);
const m_ray_dir = new THREE.Vector3(0, 0, 0);

const camera_frustum = new THREE.Frustum();
const camera_frustum_m = new THREE.Matrix4();
const axis_markers_count = 21;



const coords_from_array = (array, add_z = 0.0) => {
    const build_coords = (coords_flat) => {
        let buffer = [];
        for (let i = 0; i < coords_flat.length; i += 2) {
            buffer.push(coords_flat[i], coords_flat[i + 1], add_z);
        }
        return buffer;
    }

    let coords = [];
    for (let a of array) {
        if (a.length === 1) {
            coords.push(build_coords(a[0]));
        } else {
            for (let b of a) {
                //console.log(b.some(r => r.length === 1), b);
                coords.push(build_coords(b));
            }
        }
    }
    return coords;
}

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

const mod_HSL = (rgb_color, L_value) => {
    const hsl = {}
    rgb_color.getHSL(hsl);
    rgb_color.setHSL(hsl.h, 1.0, L_value);
}

function dom_button_check_box_set_state(id, state){
    const button = document.getElementById(id);
    button.querySelector('#check-box-0').style.display = display_inline_array[+!state];
    button.querySelector('#check-box-1').style.display = display_inline_array[+state];
    button.setAttribute('data-state', state);
}

function dom_button_check_click(e){
    const parent = e.target.closest('.button');
    const b_state = parent.dataset.state === 'true';
    dom_button_check_box_set_state(parent.id, !b_state);
    if(parent.dataset.layer){
         const wudi_layer = scene.getObjectByName('wudi_'+parent.dataset.layer);
         wudi_layer.visible = !b_state;
    }

}

function obs_handler(obj) {
    let lex = Object.entries(obj).map(e => {
        if (Array.isArray(e[1])) {
            return `${e[0]}</br> ${e[1].join('</br>')}`
        } else {
            return `${e[0]}: ${e[1]}`
        }
    });
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
    container.position.set(-map_center.x, -0.01, map_center.y-vars.view.map_vertical_deg_offset);
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

function make_ticks_divs() {
    const marks = [];
    for (let i = 0; i < axis_markers_count; i++) {
        const mark = document.createElement('div');
        mark.classList.add('dmark');
        mark.innerHTML = '0.0';
        mark.style.color = vars.colors.hex_css(vars.colors.chart_tick);
        mark.style.backgroundColor = vars.colors.hex_css(vars.colors.window);
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
        color: vars.colors.chart_guide
    });

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    return new THREE.LineSegments(geometry, material);
}

function make_hexagonal_shape(scale = 1.0) {
    const v = new Float32Array(18);
    let int = ((Math.PI * 2) / 6);
    for (let i = 0; i < v.length; i += 3) {
        v[i] = (Math.cos((i / 3) * int)) * scale;
        v[i + 1] = (Math.sin((i / 3) * int)) * scale;
        v[i + 2] = 0.0;
    }
    const a_geometry = new THREE.BufferGeometry();
    a_geometry.setAttribute('position', new THREE.BufferAttribute(v, 3));
    a_geometry.setIndex([0, 1, 2, 2, 3, 0, 3, 4, 5, 5, 0, 3]);
    return a_geometry;
}

function make_markers_group() {
    const markers_group = new THREE.Group();
    const mat = new THREE[vars.mats.mapMarkersMaterial.type](vars.mats.mapMarkersMaterial.dict);
    mat.setValues({'side': THREE[vars.mats.mapMarkersMaterial.dict.side]});
    const a_geometry = make_hexagonal_shape();

    for (let n = 0; n < axis_markers_count; n++) {
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
    return vc.set(xIntersect, planeY, zIntersect);
}

function apply_adaptive_scale(inst, v, v_lim, index, sign) {
    //#//TODO must re-normalize to scale.
    inst.getMatrixAt(index, mu);
    mu.decompose(vw, qu, vu);
    const value = v_lim === 0 || v === 0 ? (0.0001) : (v / v_lim);
    vu.setZ(value * vars.bar_scale);
    vu.setY((1 - camera_scale) * vars.bar_scale_width);
    mu.compose(vw, qu, vu);
    inst.setMatrixAt(index, mu);

    if (!inst.userData.td.color_default[index].selected) {
        utility_color.fromArray(inst.userData.td.base_color).multiplyScalar(Math.abs(value));
        inst.setColorAt(index, utility_color.clone());
        inst.userData.td.color_default[index].color = utility_color.toArray();
    }
    return true;
}

function adaptive_scaling_wudi() {
    // return;
    const wudi = scene.getObjectByName('wudi');
    //console.log('adaptive_scaling_wudi', wudi, wudi.children.length);
    if (wudi && wudi.children.length && vars.selecta.wudi.times.selected.length) {
        const wudi_up = scene.getObjectByName('wudi_up');
        const wudi_down = scene.getObjectByName('wudi_down');

        const test = wudi.children[0].userData.td;
        let index, data_index;
        let cherf = 0;
        const visible = {set: [], up: [], down: []};

        for (let c = 0; c < test.position.length; c++) {
            data_index = vars.data.wudi_index[c];
            //const r_index = wudi_up.userData.td.index.indexOf(index);
            vw.fromArray(test.position[c]);
            map_container.localToWorld(vw);
            //#//TODO make depend on distance from view also.
            if (camera_frustum.containsPoint(vw)) {
                visible.set.push([c, data_index, cherf]);
                visible.up.push([vars.data.wudi_data.current[data_index][0]]);
                visible.down.push([vars.data.wudi_data.current[data_index][1]]);
                cherf++;
            }else{
                if (wudi_up.userData.td.color_default[c] && wudi_up.userData.td.color_default[c].selected) {
                    //deselect point!
                    //console.log(data_index,c);
                    vars.selecta.wudi.point_select(data_index);
                }
            }
        }


        const lim = [Math.max(...visible.up), Math.min(...visible.down)];
        //console.log("visible.set", visible.set);
        for (let v of visible.set) {
            //DEBUG /// if (v[0] === 1085) console.log(visible.up[v[2]][0], visible.down[v[2]][0], lim, v[0]);
            apply_adaptive_scale(wudi_up, visible.up[v[2]][0], lim[0], v[0], 1.0);
            apply_adaptive_scale(wudi_down, visible.down[v[2]][0], lim[1], v[0], -1.0);
        }

        //obs_handler({LIM: lim});

        wudi_up.instanceMatrix.needsUpdate = true;
        wudi_up.instanceColor.needsUpdate = true;

        wudi_down.instanceMatrix.needsUpdate = true;
        wudi_down.instanceColor.needsUpdate = true;

    }

    return true;
}

function move_map_to_point(pid){
    const ref_pid = vars.data.wudi_index.indexOf(pid);
    ///console.log(pid, ref_pid);
    const wudi = scene.getObjectByName('wudi_points');
    const pt = wudi.userData.td.position[ref_pid];
    vc.fromArray(pt);
    map_container.localToWorld(vc);
    user_position.copy(vc);

    run_camera();
    run_ticks();
    refresh();
    adaptive_scaling_wudi();
    wudi_dub_selecta.set_from_point(pid);
}

function wudi_point_select_state(index, state, set_select = null) {
    const wudi_up = scene.getObjectByName('wudi_up');
    const wudi_down = scene.getObjectByName('wudi_down');
    const r_index = wudi_up.userData.td.index.indexOf(index);

    if (state) {
        utility_color.fromArray(wudi_up.userData.td.base_color);
        mod_HSL(utility_color, 0.6);
        wudi_up.setColorAt(r_index, utility_color.clone());
        utility_color.fromArray(wudi_down.userData.td.base_color);
        mod_HSL(utility_color, 0.6);
        wudi_down.setColorAt(r_index, utility_color.clone());

    } else if (!wudi_up.userData.td.color_default[r_index].selected) {
        utility_color.fromArray(wudi_up.userData.td.color_default[r_index].color);
        wudi_up.setColorAt(r_index, utility_color.clone());
        utility_color.fromArray(wudi_down.userData.td.color_default[r_index].color);
        wudi_down.setColorAt(r_index, utility_color.clone());

    }

    if (set_select) {
        wudi_up.userData.td.color_default[r_index].selected = state;
        wudi_down.userData.td.color_default[r_index].selected = state;
    }

    wudi_up.instanceColor.needsUpdate = true;
    wudi_down.instanceColor.needsUpdate = true;
    //inst.userData.td.intrinsic[index].color = utility_color.toArray();
}

function get_point_selection_state(data_index, inst_index) {
    //data_index should NOT be of type array.
    //this is a way to get a 2d average of point-data.
    //: ex time[1980,1981] , points[234,235,236]

    const r_sum = (arr, modu, s = 0) => {
        for (let i = 0; i < arr.length; i++) s += arr[i];
        return Math.round(s / modu);
    }

    const pt = vars.data.wudi_points.raw.data[inst_index];//.slice(6,8);

    wudi_dub_selecta.set_from_point(data_index[0]);
    const setnav = q_nav.set_geo_region('g-'+pt[6], pt[8]-1);

    let stats = null;
    if(vars.debug_tool_state) {
        stats = {'times': vars.selecta.wudi.times.selected, 'days': [], 'up': [], 'down': [], 'events': []};

        data_index.map(dp => {
            for (let d of vars.selecta.wudi.times.selected) {
                const data_point = vars.data.wudi_data[d].data[dp];
                stats.days.push(vars.data.wudi_data[d].meta.siz);
                stats.up.push(data_point[0]);
                stats.down.push(Math.abs(data_point[1]));
                stats.events.push(data_point[2])
            }
        });

        stats.pid = data_index;
        stats.iid = inst_index;
        stats.days = r_sum(stats.days, stats.times.length);
        stats.up = r_sum(stats.up, data_index.length * stats.times.length);
        stats.down = r_sum(stats.down, data_index.length * stats.times.length);
        stats.events = r_sum(stats.events, data_index.length * stats.times.length);
        stats.locat = vars.data.wudi_points.raw.data[inst_index].slice(6, 8);
    }else{
        stats = {'wudi':`${data_index}-g${pt[6]}`};
    }


    return Object.entries(stats);
}

function interactionAction() {
    //basic touches called by translateAction -> move
    ray_caster.setFromCamera(vars.user.mouse.raw, camera);
    const intersects = ray_caster.intersectObjects(scene.children, true);

    const filter = {
        protected_regions: (index = null) => {
            const figure = vars.data.protected_regions.raw[index + 1];
            return {
                head: `${title_case(figure[1])}`,
                text: [figure[3] + ' ' + figure[2], figure[8], figure[13] + '—' + figure[14], figure[6] + 'km^2', `(${index}) `]
            }
        },
        iso_bath: (index = null) => {
            return {
                text: 'isobath 100m ' + index
            }
        },
        wudi_points: (index = null) => {
            const data_index = vars.data.wudi_index[index];
            if (vars.selecta.wudi.points.hover.length) wudi_point_select_state(vars.selecta.wudi.points.hover[0], false);
            wudi_point_select_state(data_index, true);
            vars.selecta.wudi.points.hover = [data_index];
            return {
                text: get_point_selection_state([data_index], index)
            }
        },
        wudi_up: (index = null) => {
            return filter.wudi_points(index);
        },
        wudi_down: (index = null) => {
            return filter.wudi_points(index);
        },
        eco_regions: (index = null) => {
            return {
                text: 'eco_region (general) ' + index
            }
        },
        places_data: (index = null) => {
            const figure = vars.data.places_data.raw.data[index];
            return {
                head: `${title_case(figure[4])}`,
                text: [...figure.slice(5,figure.length-1).filter(m => m !== null)]
            }
        }
    }

    function make_clean(ints) {
        let len = ints.length;
        let ids = [];
        let result = [];
        let wudi_polled = false;
        let name = null;
        let instance_id = null;
        for (let i = 0; i < len; i++) {
            if (ints[i].object.name.length && ints[i].object.visible) {
                name = ints[i].object.id;
                if (ints[i].hasOwnProperty('instanceId')) instance_id = ints[i].instanceId;
                if (ids.indexOf(name) === -1 && ids.indexOf(instance_id) === -1) {
                    let index = null;
                    if (instance_id != null) {
                        // const r = ints[i].object.userData.td.index;
                        index = instance_id;///r ? r[instance_id] : instance_id;
                    } else {
                        index = ints[i].object.userData.index;
                    }

                    const is_wudi = ints[i].object.name.indexOf('wudi') !== -1;

                    if(( is_wudi && !wudi_polled ) || !is_wudi) {

                        const ref = filter.hasOwnProperty(ints[i].object.name) ? filter[ints[i].object.name](index) : null;
                        if (ref) {
                            result.push(ref);
                            if (is_wudi) wudi_polled = true;
                        }

                    }
                    ids.push(instance_id ? instance_id : name);
                }

                instance_id = null;
            }
        }
        return result;
    }

    const has_intersections = make_clean(intersects);
    vars.selecta.intersect = has_intersections.length > 0;

    if (vars.selecta.intersect) {
        vars.info.set_state(true);
        vars.info.set_text(has_intersections);
        vars.info.set_position(vars.user.mouse.screen.x, vars.user.mouse.screen.y, 'mouse');
        vars.selecta.focus_obj = 'intersection';
    }

    if (vars.selecta.moved) {
        vars.selecta.eco_region.hover = null;
        vars.selecta.moved = false;
    }

    if (!vars.selecta.intersect) {
        if (vars.selecta.wudi.points.hover.length) wudi_point_select_state(vars.selecta.wudi.points.hover[0], false);
        vars.selecta.wudi.points.hover = [];

        const eco_regions = scene.getObjectByName('eco_regions'); ///AREAS
        if (eco_regions && eco_regions.children.length) {
            const eco = eco_regions.children
                .filter(e => e.geometry.boundingBox.containsPoint(mouse_pos_map))
                .filter(e => point_in_poly(e, mouse_pos_map))
            const hover = vars.selecta.eco_region.hover;
            if (eco.length) {
                const poly = eco[0];
                if (poly.id !== hover) {
                    vars.selecta.focus_obj = 'area';
                    vars.info.set_state(true);
                    poly.geometry.boundingBox.getCenter(vw);
                    map_container.localToWorld(vw);
                    projected(vw);
                    vars.info.set_position(vw.x, vw.y);
                    const data = poly.userData.data;
                    vars.info.set_text([{head: data[2], text: `id:${data[0]}`}]);
                    poly.userData.selected(true);
                    if (hover) scene.getObjectById(hover, true).userData.selected(false);
                }
                vars.selecta.eco_region.hover = poly.id;

            } else {
                if (hover) scene.getObjectById(hover, true).userData.selected(false);
                vars.info.set_state(false);
                vars.selecta.eco_region.hover = null;
            }
        }

        if (vars.selecta.focus_obj === 'intersection') {
            vars.info.set_state(false);
        }
    }

    return true;
}

function refresh(){
    if(map_sectors_group.children.length) map_sectors_group.children.forEach(s => {
        vw.copy(s.userData.owner.objects.plane.userData.center);
        map_sectors_group.localToWorld(vw);

        root_plane.projectPoint(camera.position, vu);
        vu.sub(camera.up);
        vk.subVectors(user_position, vu).multiplyScalar(0.5 / vars.degree_scale);

        camera_projected.copy(vk);

        pos_mark_1.position.copy(vk.add(user_position));
        const L = vw.distanceTo(vk);
        if (L < (vars.levels * (vars.degree_scale)) + 2) {
            let LV = Math.round((vars.levels - Math.round(L / vars.degree_scale)) * (Math.round(camera_scale * vars.levels) / vars.levels));
            if (LV > 4) LV = 4;
            if (LV < 0) LV = 0;
            s.userData.owner.set_level(LV);
        }
    });
}

const touches_mid = {
    x:null,
    y:null,
    last:{
        x:0,
        y:0
    },
    delta:{
        x:0,
        y:0
    },
    origin:{
        x:0,
        y:0
    },
    origin_last:{
        x:0,
        y:0
    },
    origin_delta:{
        x:0,
        y:0
    }
};

function event_handler(type, evt_object){
    run_camera();

    if(type !== 'init' && type !== 'touch') obs_handler({
        plot: type,
        act:Object.entries(evt_object.actual),
        del:Object.entries(evt_object.delta),
        whl:evt_object.wheel_delta !== null ? Object.entries(evt_object.wheel_delta) : null,
        btn:evt_object.button,
        map_s:map_sectors_group.children.length})

    let action, roto_x, roto_y, pos_x, pos_y, delta_x, delta_y, scale_z;

    if (type === 'init') {
        pos_x = vars.view.width / 2;
        pos_y = vars.view.height / 2;
    }

    if(type === 'touch'){
        obs_handler({touch: evt_object.action});
        action = evt_object.action;

        const primary = evt_object.touches[0];

        if(evt_object.touches.length > 1){
            const secondary = evt_object.touches[1];
            const x_o = primary.x - secondary.x;
            const y_o = primary.y - secondary.y;
            touches_mid.last.x = touches_mid.x;
            touches_mid.last.y = touches_mid.y;
            touches_mid.x = primary.x-(x_o/2);
            touches_mid.y = primary.y-(y_o/2);
            touches_mid.delta.x = touches_mid.last.x === null ? 0 : touches_mid.x - touches_mid.last.x;
            touches_mid.delta.y = touches_mid.last.y === null ? 0 : touches_mid.y - touches_mid.last.y;

            if(evt_object.action === 'secondary-down'){
                touches_mid.origin.x = touches_mid.x;
                touches_mid.origin.y = touches_mid.y;
            }

            touches_mid.origin_delta.x = touches_mid.origin_last.x - (touches_mid.origin.x - touches_mid.x);
            touches_mid.origin_delta.y = touches_mid.origin_last.y - (touches_mid.origin.y - touches_mid.y);
            touches_mid.origin_last.x = touches_mid.origin.x - touches_mid.x;
            touches_mid.origin_last.y = touches_mid.origin.y - touches_mid.y;

            roto_x = evt_object.angle_delta;
            roto_y = touches_mid.origin_delta.y / 100.0;
            pos_x = touches_mid.x;
            pos_y = touches_mid.y;
            delta_x = touches_mid.delta.x;
            delta_y = touches_mid.delta.y;
            scale_z = 1.0 + evt_object.dist_delta;

        }else{
            pos_x = primary.x;
            pos_y = primary.y;
            delta_x = primary.x_d;
            delta_y = primary.y_d;
            touches_mid.x = null;
            touches_mid.y = null;
        }

        obs_handler({
            touch: evt_object.action,
            roto_x: roto_x,
            roto_y: roto_y,
            pos_x: pos_x,
            pos_y: pos_y,
            scale_z: scale_z,
            leg: evt_object.lag
        });
        //return;

    }else if(type !== 'init'){
        pos_x = evt_object.actual.x;
        pos_y = evt_object.actual.y;
        action = type;

        // if (type === 'down') {
        //     action = 'down';
        // }
        if (evt_object.down === true) {
            if (evt_object.button === 2 || active_keys.includes('ShiftLeft') || active_keys.includes('ShiftRight')) {
                roto_x = evt_object.delta.x / 200.0;
                roto_y = evt_object.delta.y / 200.0;
            }else{
                delta_x = evt_object.delta.x;
                delta_y = evt_object.delta.y;
            }
        }
        if (action === 'scroll'){
            scale_z = 1 + (evt_object.wheel_delta.y / 200.0);
        }
    }

    vars.user.mouse.state = action;
    vars.user.mouse.raw.x = (pos_x / vars.view.width) * 2 - 1;
    vars.user.mouse.raw.y = -(pos_y / vars.view.height) * 2 + 1;
    vars.user.mouse.screen = {x: pos_x, y: pos_y};
    document.body.style.cursor = 'pointer';

    m_ray_origin.set(vars.user.mouse.raw.x, vars.user.mouse.raw.y, 0.0).unproject(camera);
    m_ray_pos.set(vars.user.mouse.raw.x, vars.user.mouse.raw.y, 1.0).unproject(camera);
    m_ray_dir.copy(m_ray_pos.sub(m_ray_origin));

    if (type === 'init') {
        console.log('init fired');
        interactionAction();
    }else{
        if (action === 'down' || action === 'secondary-down' || action === 'secondary-up') {
            lastMouseDown.copy(rayIntersectionWithXZPlane(m_ray_origin, m_ray_dir, 0.0));
            mouseDownCameraPosition.copy(user_position);
        }
        if (roto_x && roto_y) {
            cube.rotateOnWorldAxis(y_up, roto_x);
            cube.rotateX(roto_y);
            cube.updateMatrixWorld();
            vars.info.set_state(false);
            vars.selecta.moved = true;
        }
        if (delta_x && delta_y) {
            newMouseDown.copy(rayIntersectionWithXZPlane(m_ray_origin, m_ray_dir, 0.0));
            user_position.copy(mouseDownCameraPosition.sub(newMouseDown.sub(lastMouseDown)));
            vars.info.drag_position(delta_x, delta_y);
            vars.selecta.moved = true;
        }
        if(scale_z){
            if (cam_base_pos.z < vars.min_zoom) {
                cam_base_pos.z = vars.min_zoom;
            } else {
                cam_base_pos.multiplyScalar(scale_z);
                vk.subVectors(mouse_plane_pos, user_position);
                user_position.add(vk.multiplyScalar((1 - scale_z)));
                vars.selecta.moved = true;
            }
        }
    }


    camera_scale = 1 - (camera_distance / reset_default_z);
    const zg = Math.floor(Math.log(camera_distance)) + 1;
    grid_resolution = z_mants[zg];

    ray_caster.setFromCamera(vars.user.mouse.raw, camera);
    ray_caster.ray.intersectPlane(root_plane, vk);
    mouse_plane_pos.set(vk.x, vk.y, vk.z);
    mouse_pos_map.set(mouse_plane_pos.x + vars.map.offset.x, Math.abs((mouse_plane_pos.z - vars.map.offset.y) + vars.view.map_vertical_deg_offset), 0.0);

    pos_mark_4.position.copy(mouse_plane_pos);
    grid_lines.position.copy(mouse_plane_pos);

    if (action === 'move' || action === 'touch-hover') {
        interactionAction();
    }

    if (action !== 'move' && action !== 'init') {

        adaptive_scaling_wudi();
        //run_camera();
        run_ticks();
        refresh();
    }

    if (action === 'click' || action === 'touch-click') {
        if (vars.selecta.wudi.points.hover.length) {
            vars.selecta.wudi.point_select(vars.selecta.wudi.points.hover[0]);
            vars.selecta.wudi.points.hover = [];
        }
        vars.user.mouse.clicked = true;
    }

}

function translateAction(type, actual_xy, delta_xy, object) {
    let dx, dy;
    run_camera();


    if (type === 'init') {
        dx = vars.view.width / 2;
        dy = vars.view.height / 2;
    } else {
        dx = actual_xy[0];
        dy = actual_xy[1];
    }

    vars.user.mouse.state = type;
    vars.user.mouse.raw.x = (dx / vars.view.width) * 2 - 1;
    vars.user.mouse.raw.y = -(dy / vars.view.height) * 2 + 1;
    vars.user.mouse.screen = {x: dx, y: dy};
    document.body.style.cursor = 'pointer';

    ray_caster.setFromCamera(vars.user.mouse.raw, camera);
    ray_caster.ray.intersectPlane(root_plane, vk);
    mouse_plane_pos.set(vk.x, vk.y, vk.z);
    mouse_pos_map.set(mouse_plane_pos.x + vars.map.offset.x, Math.abs((mouse_plane_pos.z - vars.map.offset.y) + vars.view.map_vertical_deg_offset), 0.0);

    m_ray_origin.copy(new THREE.Vector3(vars.user.mouse.raw.x, vars.user.mouse.raw.y, 0.0)).unproject(camera);
    m_ray_pos.copy(new THREE.Vector3(vars.user.mouse.raw.x, vars.user.mouse.raw.y, 1.0)).unproject(camera);
    m_ray_dir.copy(m_ray_pos.sub(m_ray_origin));

    if (type === 'down') {
        lastMouseDown.copy(rayIntersectionWithXZPlane(m_ray_origin, m_ray_dir, 0.0));
        mouseDownCameraPosition.copy(user_position);
    }

    if (type === 'drag') {
        document.body.style.cursor = 'all-scroll';
        if (active_keys.includes('ShiftLeft') || active_keys.includes('ShiftRight')) {
            //object is cube
            object.rotateOnWorldAxis(y_up, delta_xy[0] / 100);
            object.rotateX(delta_xy[1] / 100);
            object.updateMatrixWorld();
            vars.info.set_state(false);
        } else {
            newMouseDown.copy(rayIntersectionWithXZPlane(m_ray_origin, m_ray_dir, 0.0));
            user_position.copy(mouseDownCameraPosition.sub(newMouseDown.sub(lastMouseDown)));
            vars.info.drag_position(delta_xy[0], delta_xy[1]);
        }
        vars.selecta.moved = true;
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
        vars.selecta.moved = true;
    }

    if (type === 'clicked') {
        if (vars.selecta.wudi.points.hover.length) {
            vars.selecta.wudi.point_select(vars.selecta.wudi.points.hover[0]);
            vars.selecta.wudi.points.hover = [];
        }
        vars.user.mouse.clicked = true;
    }

    if (type === 'move') {
        //window.scrollTo(0, 0);
        //interactionAction();

        //obs_handler({wp:vars.selecta.wudi.points.hover});
    }


    if (type === 'init') {
        //interactionAction();
    }




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


    camera_scale = 1 - (camera_distance / reset_default_z);
    const zg = Math.floor(Math.log(camera_distance)) + 1;
    grid_resolution = z_mants[zg];
    run_ticks();
    refresh();



    pos_mark_4.position.copy(mouse_plane_pos);
    grid_lines.position.copy(mouse_plane_pos);

    //#// adaptive scaling of wudi data:
    if (type !== 'move') {  //} && type !== 'init') {
        adaptive_scaling_wudi();
    }

}

function toggle_debug_tools_state(override=null){
    vars.debug_tool_state = override !== null ? override : !vars.debug_tool_state;
    stats.dom.style.display = display_array[+vars.debug_tool_state];
    obs.style.display = display_array[+vars.debug_tool_state];
}

function keyAction(raw) {
    active_keys = raw;

    if (raw.includes('Space')) {
        cam_base_pos.set(0, 0, 10);
        cam_pos.set(0, 0, 0);
        user_position.set(0, 0, 0);
        cube.userData.originalMatrix.decompose(cube.position, cube.quaternion, cube.scale);
        cube.matrix.copy(cube.userData.originalMatrix);
        run_camera();
        run_ticks();
    }

    if (raw.includes('Tab')) {
        if(!vars.previous_keys.includes('Tab')) {
            toggle_debug_tools_state();
        }
    }

    vars.previous_keys = [...active_keys];
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
    //grid_lines.position.copy(user_position);
    pos_mark_2.position.copy(user_position_round);

    //visible_dimensions = visibleAtZDepth(-camera_distance, camera);
}

function run_ticks_axes(axis, tick_index, swap = null) {
    const basis = {x: 'x', z: 'z'};
    const axes = [axis_dir_x, axis_dir_y];

    if (swap) {
        basis.x = 'z';
        basis.z = 'x';
    }

    const tick_n = Math.round((user_position_round[basis[axis]]) / grid_resolution) * grid_resolution + ((tick_index - ((axis_markers_count - 1) / 2)) * grid_resolution);

    if (basis[axis] === 'x') {
        vw.set(tick_n, 0, -30 * Math.sign(axes[0].z));
        vk.set(0, 0, axes[0].z);
    } else {
        vw.set(-30 * Math.sign(axes[1].x), 0, tick_n);
        vk.set(axes[1].x, 0, 0);
    }

    if (axis === 'z') {
        if (vw.dot(cam_right) < 0) {
            vk.negate();
            if (vk.x !== 0) vw.x *= -1.0;
            if (vk.z !== 0) vw.z *= -1.0;
        }

    }

    // if(axis === 'x'){
    //     if(tick_index === ((axis_markers_count - 1) / 2)){
    //         arrow_helper_2.position.copy(vw);
    //         arrow_helper_2.setDirection(vk);
    //     }
    // }
    // if (tick_index === ((axis_markers_count - 1) / 2)) {
    //     arrow_helper_3.position.copy(vw);
    //     arrow_helper_3.setDirection(vk);
    // }

    return tick_n;
}

function run_ticks() {
    let swap = false;
    vw.set(0, 0, Math.sign(camera_projected.z));
    vk.set(Math.sign(camera_projected.x), 0, 0);

    if (camera_projected.angleTo(vk) < camera_projected.angleTo(vw)) {
        swap = true;
    }

    if (Math.abs(camera_projected.x) < 0.01 || Math.abs(camera_projected.z) < 0.01) {
        axis_dir_y.set(-Math.sign(cam_dot_z), 0, 0).normalize();
        axis_dir_x.set(0, 0, Math.sign(cam_dot_x)).normalize();
    } else {
        axis_dir_y.set(-1 * Math.sign(camera_projected.x), 0, 0);
        axis_dir_x.set(0, 0, -1 * Math.sign(camera_projected.z));
    }

    arrow_helper_4.setDirection(cam_right);

    for (let plane of axis_planes) {
        if (swap) {
            ticks.card = plane.name === 'x' ? 'N' : 'E';
        } else {
            ticks.card = plane.name === 'x' ? 'E' : 'N';
        }
        for (let m = 0; m < axis_markers_count; m++) {
            //plane.markers_geoms.children[m].position.set(0, 1, 0);
            ticks.n = run_ticks_axes(plane.name, m, swap);

            ray_caster.set(vw, vk);
            ticks.res = ray_caster.ray.intersectPlane(plane.plane, vu);
            plane.markers_divs[m].style.display = ticks.res === null ? 'none' : 'block';

            if (ticks.res !== null) {
                projected(vu);
                ticks.offset = ticks.card === 'E' ? vars.map.offset.x : -vars.map.offset.y;
                plane.markers_divs[m].innerHTML = `${(ticks.n + ticks.offset).toFixed(grid_resolution < 1 ? 2 : 0)}º ${ticks.card}`;

                ticks.rect = plane.markers_divs[m].getBoundingClientRect();
                if (plane.name === 'x') {
                    ticks.left = (vu.x - (ticks.rect.width / 2));
                    ticks.top = (vars.view.height - vars.view.x_axis_inset) - (ticks.rect.height / 2);
                } else {
                    ticks.left = vars.view.y_axis_inset;
                    ticks.top = (vu.y - (ticks.rect.height / 2));
                }
                plane.markers_divs[m].style.left = ticks.left + 'px';
                plane.markers_divs[m].style.top = ticks.top + 'px';

                const cas = (ticks.top > vars.view.height || ticks.top < 0 || ticks.left > vars.view.width || ticks.left < 0);
                plane.markers_divs[m].style.display = display_array[+!cas];
            }
        }
    }
    //obs_handler({'F': vars.view.width, 'S': sum});
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

function draw_sectors() {
    vars.map.deg = vars.degree_scale;
    vars.map.sectors = (vars.map.dims.w * (1 / vars.map.deg)) * (vars.map.dims.h * (1 / vars.map.deg));
    console.log('draw_sectors loading', vars.map.sectors, 'sectors');

    for (let i = 0; i < vars.map.sectors; i++) {
        let x = i % (vars.map.dims.w * (1 / vars.map.deg));
        let y = Math.floor(i / (vars.map.dims.w * (1 / vars.map.deg)));
        let sx = vars.map.test_bounds[0] + (x * vars.map.deg);
        let sy = (vars.map.test_bounds[3] - vars.map.deg) - (y * vars.map.deg);
        vw.set(sx, sy + vars.map.deg, 0.0);

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

    return true;
}

function draw_data_instanced(instances_group) {
    const z_color = new THREE.Color();
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
                    instance_dummy.scale.z = instance.userData.td.sign;
                }
                instance_dummy.updateMatrix();
                z_color.fromArray(instance.userData.td.color[i], 0);

                instance.setColorAt(i, z_color);
                instance.setMatrixAt(i, instance_dummy.matrix);
            }
            console.log(instance.id, instance.name);
            instance.instanceColor.needsUpdate = true;
            instance.instanceMatrix.needsUpdate = true;

        }
    }
    return 'draw_data_instanced';
}

function plot_data(obj) {
    let group;
    let is_instance = false;
    group = new THREE.Group();
    group.name = obj.name;

    if (obj.style === 'point') {
        is_instance = true;

        const datum = {
            len: null,
            color: [],
            position: [],
            sample_normal: [],
            sample_raw: []
        }

        if (obj.name === 'places_data') {
            ///custom json-ser from db based
            datum.len = vars.data[obj.name].raw.data.length -1;
            const pop = util.find_scale(obj.raw.data, 7);
            vars.data[obj.name].lookup_table = {};

            for (let i = 0; i < datum.len; i++) {
                datum.color.push([0.9, 0.9, 0.0]);
                datum.position.push([vars.data[obj.name].raw.data[i][0], vars.data[obj.name].raw.data[i][1], 0.0]);
                let norm = norm_val(vars.data[obj.name].raw.data[i][7], pop.min, pop.avg);
                if (norm > 4.0) norm = 4.0;
                if (norm < 0.5) norm = 0.5;
                datum.sample_raw.push(norm);
                vars.data[obj.name].lookup_table[vars.data[obj.name].raw.data[i][13]] = i;
            }
        }

        if (obj.name === 'protected_regions') {
            ///custom text-based
            datum.len = vars.data[obj.name].raw.length - 1;

            for (let i = 1; i < vars.data[obj.name].raw.length; i++) {
                datum.color.push([0.0, 1.0, 1.0]);
                datum.position.push([vars.data[obj.name].raw[i][obj.geom_index][0], vars.data[obj.name].raw[i][obj.geom_index][1], 0.0]);
                datum.sample_raw.push(1.0);
            }

            const area = util.find_scale(obj.raw, 6);

            obj.raw.map((e, i) => {
                if (i > 0 && e[6] !== null) {
                    let norm = norm_val(e[6], area.min, area.avg);
                    if (norm > 4.0) norm = 4.0;
                    if (norm < 1) norm = 1.0;
                    datum.sample_raw[i] = norm;
                }
            })
        }

        const geometry = make_hexagonal_shape(vars.point_scale);

        geometry.deleteAttribute('uv');
        geometry.deleteAttribute('normal');
        const material = new THREE.MeshBasicMaterial({
            color: 0xFFFFFF,
            side: THREE.FrontSide,
            transparent: true,
            opacity: 0.5,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });

        const instance = new THREE.InstancedMesh(geometry, material, datum.len);
        instance.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        instance.name = obj.name;
        instance.userData.type = 'scaled_point';
        //if (obj.name === 'protected_regions') instance.userData.type = 'scaled_point';
        instance.userData.td = datum;
        group.add(instance);

    } else {
        //for text-based datasets with polygonal geometries
        console.log(obj);
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
                        if (is_complex) {
                            const in_shapes = geom_obj.in.map(i => new THREE.Shape(array_to_xy(i).points2));
                            if (in_shapes.length) polygon_shape.holes = in_shapes;
                        }
                        const geometry = new THREE.ShapeBufferGeometry(polygon_shape);
                        const material = new THREE.MeshBasicMaterial({color: 0xffffff});
                        element = new THREE.Mesh(geometry, material);
                    } else if (obj.style === 'line') {

                        const geometry = new THREE.BufferGeometry().setFromPoints(exterior.points3);
                        const material = new THREE.LineBasicMaterial({
                            color: vars.colors[obj.name].select[0],
                            transparent: true
                        });
                        element = new THREE.Line(geometry, material);
                        element.computeLineDistances();
                        element.name = obj.name;// used by intersection-tests for boundaries.
                        //element.name = obj.name;// `eco${vars.data[obj.name].raw[i][0]}`;
                    }

                    element.userData.x_coords = exterior.x;
                    element.userData.y_coords = exterior.y;
                    element.userData.index = i;
                    element.userData.data = vars.data[obj.name].raw[i];

                    element.userData.selected = (state) => {
                        element.material.setValues({color: vars.colors[obj.name].select[+state]});
                        element.position.setZ(+state * 0.01);
                        return state;
                    }
                    element.geometry.computeBoundingBox();
                    group.add(element);

                } else if (obj.style === 'multi_line') {
                    const material = new THREE.LineBasicMaterial({color: vars.colors[obj.name].select[0]});
                    let element;
                    const batch = coords_from_array(l_obj, -100 / vars.depth_max);//.flat(1);
                    for (let vertices of batch) {
                        if (vertices.length > 9) {
                            const geometry = new THREE.BufferGeometry();
                            geometry.setAttribute('position', new THREE.BufferAttribute(Float32Array.from(vertices), 3));
                            element = new THREE.Line(geometry, material);
                            element.name = obj.name;
                            element.geometry.computeBoundingBox();
                            element.userData.index = i;
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
}

//#// is this the place to begin outlining geo-regions? probably.
function wudi_plot(obj) {
    // points, up_bars, down_bars
    //#//BASIC POINTS:
    const group = new THREE.Group();
    group.name = 'wudi';
    const data = vars.data[obj.name].raw.data;
    const point_data_td = {
        len: data.length,
        visible: true,
        color: data.map(v => [0.9, 0.5, 0.9]),
        position: data.map((v) => [v[3], v[2], 0.0]),
        raw: data.map(v => 0.0),
        index: data.map(v => v[8] - 1),
    }
    vars.data.wudi_index = point_data_td.index;

    const geo_regions = {};
    data.map(d => {
        const g = 'g-'+d[6];
        if(!geo_regions.hasOwnProperty(g)) geo_regions[g] = [];
        geo_regions[g].push(d[8] - 1);
    });

    vars.data.geo_regions = geo_regions;
    console.log(vars.data.geo_regions);
    // Object.entries(geo_regions).map((k,v,i) => console.log(k,v,i));
    // //console.log(point_data_td.index);

    const geometry = make_hexagonal_shape(vars.wudi_point_scale); //wudi_point_scale
    geometry.deleteAttribute('uv');
    geometry.deleteAttribute('normal');
    const material = new THREE.MeshBasicMaterial({
        color: 0xFFFFFF,
        side: THREE.FrontSide,
        transparent: true,
        opacity: 1.0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    });

    const instance = new THREE.InstancedMesh(geometry, material, point_data_td.len);
    instance.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    instance.name = 'wudi_points';
    instance.userData.type = 'points';
    instance.userData.td = point_data_td;
    instance.visible = point_data_td.visible;
    group.add(instance);

    const bar_instances = [
        {name: 'wudi_down', len: data.length, base_color: [1.0, 0.0, 0.0], visible: true, sign: -1},
        {name: 'wudi_up', len: data.length, base_color: [0.0, 0.0, 1.0], visible: true, sign: 1},
        {name: 'wudi_meta', len: data.length, base_color: [0, 0, 0], visible: false, sign: 1}
    ];

    const bar_attributes = ['color', 'position', 'rotation', 'scale', 'value', 'raw', 'index', 'color_default'];

    for (let bar of bar_instances) {
        for (let a of bar_attributes) bar[a] = [];

        for (let i = 0; i < data.length; i++) {
            const A = new THREE.Vector3(data[i][1], data[i][0], 0.0);
            const B = new THREE.Vector3(data[i][5], data[i][4], 0.0);
            const angle = Math.atan2(B.y - A.y, B.x - A.x);
            bar.position.push([A.x, A.y, A.z]);
            bar.rotation.push(angle.toFixed(5));
            bar.scale.push(A.distanceTo(B));
            bar.color.push([0.0, 0.0, 0.0]);
            bar.value.push(0.005);
            bar.raw.push(0.0);
            bar.index.push(data[i][8] - 1);
            bar.color_default.push({color: null, selected: false});
        }
    }

    //#//TODO make y-scale depend on zoom.
    const bar_geometry = new THREE.BoxBufferGeometry(1, vars.bar_scale_width, 1);
    bar_geometry.translate(0.5, 0.0, 0.5);
    bar_geometry.deleteAttribute('uv');
    bar_geometry.deleteAttribute('normal');

    const bar_material = new THREE.MeshBasicMaterial({
        color: 0xFFFFFF,
        side: THREE.FrontSide,
        transparent: true,
        opacity: 1.0,
        blending: THREE.AdditiveBlending, //THREE.NormalBlending, //
        depthWrite: true
    });

    for (let bar of bar_instances) {
        const instance = new THREE.InstancedMesh(bar_geometry, bar_material, bar.len);
        instance.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        // instance.instanceColor.needsUpdate = true;
        // instance.instanceMatrix.needsUpdate = true;
        instance.name = bar.name;
        instance.userData.td = bar;
        instance.userData.type = 'bar';
        instance.visible = bar.visible;
        group.add(instance);
    }

    map_container.add(group);
    //     const group = scene.getObjectByName('wudi');
    // //draw_data_instanced(group);
    // // run_camera();

    draw_data_instanced(group);
    console.log(group);
    return 'plotted';
}

function wudi_get_data(times_arr) {
    const post_obj_list = times_arr.map(t => {
        return {
            "url": "/wudi", "tim": `${t}`, "type": "json-ser", "name": "wudi_data", "tck": [0, 0, t]
        }
    });
    fetchPOST(post_obj_list).then(object_list => wudi_set_data(object_list));
    if (vars.selecta.wudi.points.selected.length) wudi_get_point_detail(vars.selecta.wudi.points.selected);
    return true;
}

function wudi_get_point_detail(points_selected) {
    const post_obj_list = [];
    for (let t of vars.selecta.wudi.times.selected) {
        const request_points_selected = [];
        for (let p of points_selected) {
            const time_slot = `${p}-${t}`;
            if (!vars.wudi_point_cache.hasOwnProperty(time_slot)) {
                vars.wudi_point_cache[time_slot] = 'waiting';
                request_points_selected.push(p);
            }
        }
        if (request_points_selected.length) {
            post_obj_list.push({
                "url": "/wudi", "tim": `${t}`, "type": "json-ser", "name": "wudi_daily", "special": request_points_selected
            });
        }
    }

    if (post_obj_list.length) {
        fetchPOST(post_obj_list).then(object_list => wudi_set_chart_daily(object_list));
    } else {
        wudi_graph_chart_daily();
    }

    return true;
}

function wudi_graph_chart_daily() {
    const style_current = graph_bar.style.display;

    if(vars.selecta.wudi.points.selected.length) {
        const diagonal = vars.selecta.wudi.times.selected.map(t => {
            return Math.max(...vars.selecta.wudi.points.selected.map(p => vars.wudi_point_cache[`${p}-${t}`].meta));
        });

        const max_len = Math.max(...diagonal);
        const aggregate = new Array(max_len).fill(0);
        let res_count = 0;
        let mean = 0;
        for (let t of vars.selecta.wudi.times.selected) {
            for (let p of vars.selecta.wudi.points.selected) {
                const time_slot = `${p}-${t}`;
                vars.wudi_point_cache[time_slot].data.map((d, i) => {
                    aggregate[i] += d[0];
                    mean += d[0];
                });
                res_count++;
            }
        }

        mean /= res_count;
        const aggregate_avg = aggregate.map(a => Math.round((a / res_count) * 1000) / 1000);
        const graph_obj = {
            xlim: [0, max_len],
            ylim: [Math.min(...aggregate_avg), Math.max(...aggregate_avg)],
            mean: [mean / max_len],
            data: aggregate_avg
        }

        graph(graph_obj, vars.view.width, vars.view.graph_obj_height);
        graph_bar.classList.remove('hidden');
        graph_bar.style.display = 'block';
    }else{
        graph_bar.style.display = 'none';
    }

    if(style_current !== graph_bar.style.display) windowRedraw();

}

function wudi_set_chart_daily(result_obj) {
    // console.log(result_obj);
    // return;
    result_obj.forEach(obj => {
        const request_length = obj.special.length; ///number of points per time.
        const asset_raw_length = obj.raw.data.length;
        const general_length = asset_raw_length / request_length;/// > general_length ? asset_raw_length/request_length : general_length;
        const subset_arrays = array_chuk(obj.raw.data, general_length);
        subset_arrays.map((v, n) => {
            const time_slot = `${obj.special[n]}-${obj.tim}`;
            vars.wudi_point_cache[time_slot] = {'data': v, 'meta': v.length};
        })
    });

    wudi_graph_chart_daily();
}

function wudi_set_data(obj_list) {
    if (!vars.data.hasOwnProperty('wudi_data')) vars.data.wudi_data = {points_count: 0, current: []};
    obj_list.forEach(obj => {
        console.log(obj);
        //#//updates and draws the instances
        const data = obj.raw.data;
        vars.data.wudi_data.points_count = data.length;
        const meta = obj.raw.meta;
        const time_slot = obj.tim === '40' ? 'all' : obj.tim.toString();
        vars.selecta.wudi.times.loaded.push(time_slot);
        vars.data.wudi_data[time_slot] = {'data': data, 'meta': meta};
    });
    //run averager here:
    return wudi_set_data_selection();
}

function wudi_set_data_selection() {

    const points_count = vars.data.wudi_data.points_count;
    const times_count = vars.selecta.wudi.times.selected.length;
    const new_normals = [];
    const new_aggregated = [];

    if (points_count === 0) return false;

    console.log('wudi_set_data_selection', points_count, times_count);
    //CRAZY//
    for (let i = 0; i < points_count; i++) {
        new_normals.push([0.0, 0.0, 0.0, 0.0, 0.0]);
        new_aggregated.push([0.0, 0.0, 0.0, 0.0, 0.0, []]);
    }
    const meta_avg = {siz: 0, u_me: 0, d_me: 0, u_mx: 0, d_mx: 0};
    for (let t = 0; t < times_count; t++) {
        const tn = vars.selecta.wudi.times.selected[t].toString();
        console.log(tn);
        const data = vars.data.wudi_data[tn].data;
        const meta = vars.data.wudi_data[tn].meta;


        Object.entries(meta).map((k) => meta_avg[k[0]] += k[1]);
        for (let i = 0; i < points_count; i++) {
            for (let d = 0; d < 3; d++) new_aggregated[i][d] += data[i][d];
            new_aggregated[i][3] += data[i][0];
            new_aggregated[i][4] += data[i][1];
            if (Array.isArray(data[i][3])) {
                for (let ed of data[i][3]) {
                    if (ed) new_aggregated[i][5].push(tn + ed);
                }
            } else {
                if (data[i][3]) new_aggregated[i][5].push(tn + data[i][3]);
            }
        }
    }
    Object.keys(meta_avg).map(k => meta_avg[k] = Math.round(meta_avg[k] / times_count));
    //const rel_meta = [meta_avg.u_mx, meta_avg.d_mx, 1, meta_avg.u_me, meta_avg.d_me];
    const rel_meta = [meta_avg.u_me, meta_avg.d_me, 1, meta_avg.u_mx, meta_avg.d_mx];

    for (let i = 0; i < points_count; i++) {
        for (let d = 0; d < 5; d++) {
            new_aggregated[i][d] = Math.round(new_aggregated[i][d] / times_count);
            new_normals[i][d] = (Math.round((new_aggregated[i][d] / rel_meta[d]) * 10000) / 10000) * Math.sign(rel_meta[d]);
        }
        new_aggregated[i].splice(3, 2);
    }

    // CRAZY //
    // console.log(new_aggregated);
    // console.log(new_normals);

    const instance_names = ['wudi_up', 'wudi_down'];

    for (let i = 0; i < instance_names.length; i++) {

        const wudi_obj = scene.getObjectByName(instance_names[i]);
        const base_color = new THREE.Color().fromArray(wudi_obj.userData.td.base_color, 0);
        const c_hsl = {}
        base_color.getHSL(c_hsl);

        const data_td = {
            value: [],
            color: [],
            raw: []
        }
        //#//td.sign is already set.
        for (let d = 0; d < points_count; d++) {
            const has_index = wudi_obj.userData.td.index.indexOf(d) !== -1;
            if (has_index) {
                const value = new_normals[d][i];
                const color = base_color.clone().multiplyScalar(Math.abs(value)).toArray();
                data_td.value.push(value);
                data_td.color.push(color);
                data_td.raw.push(value);
            }
        }
        Object.keys(data_td).map(k => wudi_obj.userData.td[k] = data_td[k]);
    }

    vars.data.wudi_data.current = new_normals;
    vars.data.wudi_data.aggregated = new_aggregated;


    adaptive_scaling_wudi();
    //adaptive_scaling_wudi();

}

function windowRedraw(first_run=null) {
    console.log("windowRedraw fired.");
    window.scrollTo(0, 0);

    const w = window.innerWidth;
    const h = window.innerHeight;

    q_nav_bar.style.height = vars.view.q_nav_bar_height+'px';

    let bars_height = 0;
    const bars = [...document.querySelectorAll('.bar')];


    bars.map(b => {
        const bbox = b.getBoundingClientRect();//offsetHeight;//
        if(b.style.display !== 'none') bars_height += bbox.height;
        b.classList.remove('hidden');
        console.log(b, bbox);
    });



    ww = w;
    wh = ((h - vars.view.bottom_buffer) - bars_height);

    plot.style.width = ww + 'px';
    plot.style.height = wh + 'px';

    vars.view.width = ww;
    vars.view.height = wh;

    console.log(ww, wh, bars_height);

    if (camera) {
        camera.aspect = ww / wh;
        camera.updateProjectionMatrix();
        renderer.setSize(ww, wh);
        run_camera();
        run_ticks();
    }

    x_major_axis.style['border-color'] = vars.colors.hex_css(vars.colors.chart_tick);
    x_major_axis.style.opacity = '0.25';
    x_major_axis.style.left = '0px';
    x_major_axis.style.top = (vars.view.height-vars.view.x_axis_inset)+'px';
    x_major_axis.style.width = vars.view.width+'px';
    x_major_axis.style.height = '1px';

    y_major_axis.style['border-color'] = vars.colors.hex_css(vars.colors.chart_tick);
    y_major_axis.style.opacity = '0.25';
    y_major_axis.style.left = (vars.view.y_axis_inset*2)+'px';
    y_major_axis.style.top = '0px';
    y_major_axis.style.height = vars.view.height+'px';
    y_major_axis.style.width = '1px';

    title_box.style.bottom = vars.view.title_bottom_offset+'px';
    title_box.classList.remove('hidden');

    if(!vars.view.init_state){
        const buttons = [...document.querySelectorAll(".button")];
        buttons.map(b => {
        const svg_check_zero = document.getElementById("check-box-0").cloneNode(true);
        const svg_check_one = document.getElementById("check-box-1").cloneNode(true);
        b.insertBefore(svg_check_one, b.firstChild);
        b.insertBefore(svg_check_zero, b.firstChild);
        b.parentNode.addEventListener('mouseup', dom_button_check_click);
        dom_button_check_box_set_state(b.id, true);
    });
    }

    //plot.focus();
}

function loader_notify(count, message = null) {
    vars.loader_notify.ct += count;
    //let what = {loading:vars.loader_notify.ct};
    if (message && vars.loader_notify_messages) {
        vars.loader_notify.list.push(`${message}(${count})`);
        const what = {loading: vars.loader_notify.ct, list: vars.loader_notify.list};
        //console.log(what);
        obs_handler(what);
    }
    if (vars.loader_notify.ct === 0) {
        //load_complete('true');
    }
}

function init() {
    camera = new THREE.PerspectiveCamera(45, ww / wh, 0.1, 1000);
    scene = new THREE.Scene();
    scene.background = new THREE.Color(vars.colors.window);
    //scene.fog = new THREE.Fog( vars.colors.window, 0.015, 10 );
    // scene.Fog();

    let reg_0 = {}
    scene.background.getHSL(reg_0);
    utility_color.setHSL(reg_0.h, reg_0.s, reg_0.l * 1.2);
    vars.colors.eco_regions.select[0] = utility_color.getHex();
    utility_color.setHSL(reg_0.h, reg_0.s, reg_0.l * 1.5);
    vars.colors.eco_regions.select[1] = utility_color.getHex();

    vars.colors.iso_bath.select = vars.colors.eco_regions.select;
    //mat.setValues({color: vars.colors.eco_regions.select[1]});


    vars.user.group = new THREE.Group();
    map_sectors_group = new THREE.Group();

    renderer = new THREE.WebGLRenderer({
        powerPreference: "high-performance",
        antialias: true
    });

    renderer.setPixelRatio(1);//window.devicePixelRatio);//(2)
    renderer.setSize(ww, wh);

    root_plane = new THREE.Plane(y_up);
    // vc.set(0,0,vars.view.map_vertical_deg_offset);
    // root_plane.translate(vc);
    //position.setY(vars.view.map_vertical_deg_offset);
    // scene.add(root_plane);

    const col_xy = new THREE.Color("hsl(100, 0%, 35%)");
    const col_gd = new THREE.Color("hsl(100, 0%, 30%)");
    gridHelper = new THREE.GridHelper(20, 20, col_xy, col_gd);
    scene.add(gridHelper);
    gridHelper.visible = vars.grid_visible;

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

    axes_helper = new THREE.AxesHelper(5);
    axes_helper.visible = vars.arrow_helper_visible;
    scene.add(axes_helper);

    axis_planes.push({
        name: 'x',
        plane: new THREE.Plane(),
        position: new THREE.Vector3(0, -1, 0),
        up: new THREE.Vector3(),
        mark: make_position_mark(1.0),
        // markers_geoms: make_markers_group(),
        markers_divs: make_ticks_divs()
    })

    axis_planes.push({
        name: 'z',
        plane: new THREE.Plane(),
        position: new THREE.Vector3(-1, 0, 0),
        up: new THREE.Vector3(),
        mark: make_position_mark(1.0),
        // markers_geoms: make_markers_group(),
        markers_divs: make_ticks_divs()
    })

    // scene.add(axis_planes[0].markers_geoms);
    // scene.add(axis_planes[1].markers_geoms);


    arrow_helper_1 = new THREE.ArrowHelper(vw, vk, 1, 0xFFFF00, 0.3, 0.3);
    arrow_helper_2 = new THREE.ArrowHelper(vw, vk, 3, 0x2222FF, 0.3, 0.3);
    arrow_helper_3 = new THREE.ArrowHelper(vw, vk, 3, 0xFF2222, 0.3, 0.3);
    arrow_helper_4 = new THREE.ArrowHelper(vw, vk, 3, 0xFFFF00, 0.3, 0.3);

    vars.user.group.add(pos_mark_3);
    vars.user.group.add(arrow_helper_1);

    scene.add(arrow_helper_2);
    scene.add(arrow_helper_3);
    scene.add(arrow_helper_4);

    arrow_helper_1.visible = vars.arrow_helper_visible;
    arrow_helper_2.visible = vars.arrow_helper_visible;
    arrow_helper_3.visible = vars.arrow_helper_visible;
    arrow_helper_4.visible = vars.arrow_helper_visible;

    scene.add(vars.user.group);

    const ref_geom = make_hexagonal_shape(0.01);
    const ref_mat = new THREE[vars.mats.mapMarkersMaterial.type](vars.mats.mapMarkersMaterial.dict);
    ref_marker = new THREE.Mesh(ref_geom, ref_mat);
    ref_marker.name = 'ref_mark';
    ref_marker.rotateX(Math.PI / -2);
    // ref_marker.position.set(12,12,12);
    scene.add(ref_marker);
    //vars.user.group.visible = false;

    stats = new Stats();
    stats.dom.style.opacity = 0.2;
    document.body.appendChild(stats.dom);

    map_container = make_map_container(vars.map.test_bounds);
    map_container.add(map_sectors_group);
    scene.add(map_container);
    map_plane.visible = false;

    //dragControls(renderer.domElement, translateAction, cube, {passive: true});

    dragControls(renderer.domElement, event_handler);//, cube, {passive: false, capture: true});

    keyControls(window, keyAction);

    grid_lines = make_grid_lines();
    scene.add(grid_lines);


    visible_dimensions = visibleAtZDepth(-default_z, camera);
    cam_base_pos.z = ((default_z / visible_dimensions.w) * vars.map.dims.w) + 2.0;
    reset_default_z = cam_base_pos.z;

    let zg = Math.floor(Math.log(cam_base_pos.z)) + 1;
    grid_resolution = z_mants[zg];

    ray_caster.params.Line.threshold = 0.005;
    ray_caster.params.Points.threshold = 0.025;

    event_handler('init', null);

    toggle_debug_tools_state(true);


    wudi_dub_selecta.make(null);
    scene.add(wudi_dub_selecta.object);



    plot.appendChild(renderer.domElement);

    run_camera();
    run_ticks();


    vars.view.init_state = true;
}


const wudi_dub_selecta = {
    object: new THREE.Group(),
    line_material: new THREE.LineBasicMaterial({color: vars.colors.dub_selecta}),
    buff: new Float32Array([1,0,0,-1,0,0]),
    geom: null,
    mark: [],
    dub_line: null,
    make: (e) => {
        wudi_dub_selecta.geom = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(wudi_dub_selecta.buff, 3));
        wudi_dub_selecta.dub_line = new THREE.LineSegments(wudi_dub_selecta.geom, wudi_dub_selecta.line_material);
        for(let c=0;c<2;c++) {
            const ref_geom = make_hexagonal_shape(0.01);
            const ref_mat = new THREE.MeshBasicMaterial({color: vars.colors.dub_selecta});
            ref_marker = new THREE.Mesh(ref_geom, ref_mat);
            ref_marker.rotateX(Math.PI / -2);
            wudi_dub_selecta.mark.push(ref_marker);
            wudi_dub_selecta.object.add(ref_marker);
        }
        wudi_dub_selecta.object.add(wudi_dub_selecta.dub_line);
        wudi_dub_selecta.object.visible = false;
    },
    set: (p1, p2) =>{
        wudi_dub_selecta.object.visible = true;
        const position = wudi_dub_selecta.geom.getAttribute('position');
        position.setXYZ(0, p1.x,p1.y,p1.z);
        position.setXYZ(1, p2.x,p2.y,p2.z);
        wudi_dub_selecta.geom.attributes.position.needsUpdate = true;
        wudi_dub_selecta.dub_line.geometry.computeBoundingSphere();
        for(let c=0;c<2;c++) {
            wudi_dub_selecta.mark[c].position.set(position.array[c * 3], position.array[c * 3 + 1], position.array[c * 3 + 2]);
        }
    },
    set_from_point: (pid) =>{
        const t_ref = scene.getObjectByName('ref_mark');
        const ref_point = vars.data.wudi_index.indexOf(pid);
        const pt = vars.data.wudi_points.raw.data[ref_point];
        vw.set(pt[1],pt[0],0.0);
        vk.set(pt[5],pt[4],0.0);
        vu.subVectors(vk,vw);
        vc.crossVectors(vu,z_in).negate();
        vc.add(vu.multiplyScalar(0.5).add(vw));
        map_container.localToWorld(vc);
        t_ref.position.copy(vc);
        map_container.localToWorld(vw);
        map_container.localToWorld(vk);
        wudi_dub_selecta.set(vw,vk);
    },
}

//#// source of many indexing problems
const q_nav = {
    q_nav_event: (e) => {
        obs_handler({e:e.target});
    },
    area_strip: q_nav_bar.querySelector('.area-strip'),
    // strip_canvas: q_nav_bar.querySelector('.strip-canvas'),
    base_position: q_nav_bar.querySelector('.base-position'),
    label: q_nav_bar.querySelector('.label'),
    label_top: null,
    offset: null,
    offset_pixels: null,
    region_length: null,
    region_id: null,
    region_width_px: null,
    strip_canvases: {},
    current_position:null,
    touch_trace:{
        pos_x: null,
        delta_x: null
    },
    draw_strip: (reg_id, items, start_index) => {
        const has_container = q_nav.area_strip.querySelector('.area-div-container');
        const svg_circle = document.getElementById('basic-circle');
        const svg_inside_circle = document.getElementById('within-circle');

        if(has_container){
             if(has_container.id === 'sg-'+reg_id){
                 return;
             }else{
                 if(!q_nav.strip_canvases.hasOwnProperty(has_container.id)) {
                     q_nav.strip_canvases[has_container.id] = has_container.cloneNode(true);
                 }
             }
        }

        if(q_nav.strip_canvases.hasOwnProperty('sg-'+reg_id)) {
            q_nav.area_strip.innerHTML = '';
            q_nav.area_strip.appendChild(q_nav.strip_canvases['sg-'+reg_id].cloneNode(true));
        }else{
            const container = document.createElement("div");
            container.classList.add("area-div-container");

            container.setAttribute('id', 'sg-'+reg_id);
            const places_instance = scene.getObjectByName('places_data').children[0];
            const protected_instance = scene.getObjectByName('protected_regions').children[0];

            for(let c = 0; c<items;c++){
                const r_div = document.createElement("div");
                r_div.classList.add("area-div");

                let index = null;
                if(reg_id === 'g-1'){
                    index = vars.data.wudi_index[start_index+c];
                }else{
                    index = start_index+c;
                }

                const plb = vars.data.wudi_assoc.raw.data[index];
                const _has_protected = plb[1] !== null;
                const _has_inside_protected = plb[3] !== null;
                const _has_place = plb[4] === null ? false: vars.data.places_data.lookup_table.hasOwnProperty(plb[4]);
                const allowed = true;

                if(allowed) {
                    if (_has_protected) {
                        const protected_scale = protected_instance.userData.td.sample_raw[plb[1]];
                        const circle = svg_circle.cloneNode(true);
                        circle.setAttribute('id', '');
                        circle.classList.add('svg-minimized');
                        circle.classList.add('area-acg-protected');
                        circle.querySelector('circle').setAttribute('r', (60 / 4) * protected_scale);
                        circle.addEventListener('mouseover', q_nav.q_nav_event, false);
                        r_div.appendChild(circle);
                    }

                    if (_has_inside_protected) {
                        let has = null
                        if (Array.isArray(plb[3])) {
                            has = plb[3][0];
                        } else {
                            has = plb[3];
                        }

                        const protected_scale = protected_instance.userData.td.sample_raw[has];
                        const circle = svg_circle.cloneNode(true);
                        ///const circle = svg_inside_circle.cloneNode(true);
                        circle.setAttribute('id', '');
                        circle.classList.add('svg-minimized');
                        circle.classList.add('area-acg-protected-inside');
                        circle.querySelector('circle').setAttribute('r', (60 / 4) * protected_scale);
                        circle.addEventListener('mouseover', q_nav.q_nav_event, false);
                        r_div.appendChild(circle);
                    }

                    if (_has_place) {
                        const place_data_index = vars.data.places_data.lookup_table[plb[4]];
                        const place_scale = places_instance.userData.td.sample_raw[place_data_index];
                        const circle = svg_circle.cloneNode(true);
                        circle.setAttribute('id', '');
                        circle.classList.add('svg-minimized');
                        circle.classList.add('area-acg-place');
                        circle.querySelector('circle').setAttribute('r', (60 / 5) * place_scale);
                        circle.addEventListener('mouseover', q_nav.q_nav_event, false);
                        r_div.appendChild(circle);
                    }
                }

                r_div.style.left = c*vars.q_nav.segment_width+'px';

                container.appendChild(r_div);
            }

            q_nav.area_strip.innerHTML = '';
            q_nav.area_strip.appendChild(container);
        }

        plot.focus();
        return false;
    },
    get_point: () => {
        const rc = Math.round(q_nav.offset*q_nav.region_length)+1;
        return rc > q_nav.region_length ? 1 : rc;
    },
    optimise_strip: () => {
        const nav_parts = q_nav.area_strip.querySelectorAll('.area-div');
        const r_w = q_nav.offset*q_nav.region_width_px;
        if(nav_parts) [...nav_parts].map(n => {
            const cond = (Math.abs(r_w-parseInt(n.style.left)) <= (vars.view.width/2.0));
            n.style.display = ['none','block'][+cond];
        });
    },
    set_geo_region: (reg_id, point=null) => {
        if(point !== null && point !== q_nav.current_position){
            console.log('q_nav called set_geo_region');
            const r = vars.data.geo_regions[reg_id];
            const r_pos = r.indexOf(point);

            q_nav.region_id = reg_id;
            q_nav.region_length = r.length;
            q_nav.offset = r_pos/(r.length);
            q_nav.offset_pixels = (vars.view.width*q_nav.offset);
            q_nav.region_width_px = r.length*vars.q_nav.segment_width;

            q_nav.reposition();
            q_nav.current_position = point;
            q_nav.draw_strip(q_nav.region_id, q_nav.region_length, r[0]);
            q_nav.optimise_strip();
        }

        return false;
    },
    reposition: () => {
        console.log('q_nav called reposition');
        q_nav.optimise_strip();
        q_nav.label.innerHTML = `${q_nav.get_point()}/${q_nav.region_length}`;
        q_nav.area_strip.style.width = (q_nav.region_width_px)+'px';
        q_nav.area_strip.style.left = ((vars.view.width/2.0)-((q_nav.offset*q_nav.region_width_px)-(vars.q_nav.segment_width/2)))+'px';
        return false;
    },
    init: () => {
        dragControls(q_nav_bar, q_nav.event_handler);//, {}, {passive: true});
        q_nav.label_top = (vars.view.q_nav_bar_height/2)+(q_nav.label.getBoundingClientRect().height/-2);
        q_nav.label.style.top = q_nav.label_top+'px';
        q_nav.label.style.left = (vars.view.width/2.0)+'px';
        q_nav.base_position.style.left = (vars.view.width/2.0)-(vars.q_nav.segment_width/2.0)+'px';

        alert((vars.view.width/2.0));

        q_nav.base_position.style.width = (vars.q_nav.segment_width)+'px';
        q_nav.base_position.style.height = vars.view.q_nav_bar_height+'px';
        q_nav.area_strip.style.height = vars.view.q_nav_bar_height+'px';
        // q_nav.strip_canvas.width = 0;//q_nav.region_width_px;
        // q_nav.strip_canvas.height = 0;//vars.view.q_nav_bar_height;
        return false;
    },
    event_handler: (type, evt_object_n) => {
        const r_interval = Math.round((q_nav.offset_pixels/q_nav.region_width_px)*q_nav.region_length);
        let pos_x, delta_x, action;

        if(type === 'touch'){
            action = evt_object_n.action;
            if(evt_object_n.touches.length){
                const primary = evt_object_n.touches[0];
                pos_x = primary.x;
                delta_x = primary.x_d;
                q_nav.touch_trace.pos_x = primary.x;
                q_nav.touch_trace.delta_x = primary.x_d;
            }else{
                pos_x = q_nav.touch_trace.pos_x;
                delta_x = q_nav.touch_trace.delta_x;
            }
        }else{
            action = type;
            pos_x = evt_object_n.actual.x;
            delta_x = evt_object_n.delta.x;
        }

        obs_handler({q_nav: action, p:pos_x, d:delta_x});

        if(action === 'drag'){
            q_nav.offset_pixels += delta_x;
            q_nav.offset = util.naturalize_on_loop(r_interval/q_nav.region_length, true);
            q_nav.reposition();
            move_map_to_point(vars.data.geo_regions[q_nav.region_id][q_nav.get_point()-1]);

        }else if(action === 'click' || action === 'touch-click'){

            const pfx = (vars.view.width/2.0)-pos_x;
            // alert(pfx);

            const fx = (vars.view.width/2.0) - Math.round(pfx/vars.q_nav.segment_width)*vars.q_nav.segment_width;///-(vars.q_nav.segment_width/2);




            const click_pos = (((vars.view.width/2.0)-(q_nav.offset*q_nav.region_width_px))-fx)*-1;

            const click_offset = (click_pos/q_nav.region_width_px);
            const click_ref = Math.round(click_offset*q_nav.region_length);

            if(click_ref >= 0 && click_ref <= q_nav.region_length){
                q_nav.offset = click_offset;
                q_nav.reposition();
                move_map_to_point(vars.data.geo_regions[q_nav.region_id][q_nav.get_point()-1]);
            }
            //obs_handler({q_nav:click_ref});
        }else{
            q_nav.offset_pixels = q_nav.offset*q_nav.region_width_px;///vars.view.width;
        }

        return false;
    }
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
                plot_data(obj);
                break;
            case 'json':
                vars.data[obj.name] = obj;
                plot_data(obj);
                break;
            case 'json-ser':
                console.log('json-ser', obj.name);
                if (obj.name === 'places_data'){
                    vars.data[obj.name] = obj;
                    console.log('what places_data', obj);
                    plot_data(obj);
                }
                if (obj.name === 'wudi_points') {
                    vars.data[obj.name] = obj;
                    wudi_plot(obj);
                }
                if (obj.name === 'wudi_assoc') {
                    vars.data[obj.name] = obj;
                    console.log(obj);
                }
                if (obj.name === 'wudi_data') {
                    wudi_set_data([obj]);
                }
                break;
            default:
                console.log(`callback found no data of type ${obj.type}`);
        }
    });
    return true;
}

let payload = [];
for (let i = 0; i < 100; i++) {
    payload.push(i);
}

const post_obj_list = [
    {"url": "/map", "table": "places_fine", "type": "json-ser", "name": "places_data", "style":"point", "tck": [0, 0, 0]},
    {"url": "/wudi", "table": "turn_table", "type": "json-ser", "name": "wudi_points", "tck": util.shuffle_array(payload)},
    {"url": "/wudi", "table": "assoc", "type": "json-ser", "name": "wudi_assoc", "tck": util.shuffle_array(payload)},
    {"url": "/wudi", "tim": "40", "type": "json-ser", "name": "wudi_data", "tck": [0, 0, 0]},
]

const obj_list = [
    {url: './data/raw-protected-15.txt', type: 'csv_text', name: 'protected_regions', style: 'point', columns: 15, geom_index: 12},
    {url: './data/raw-georegions-11.txt', type: 'csv_text', name: 'eco_regions', columns: 11, style: 'line', geom_index: 10, is_complex: true},
    {url: './data/raw-isobath-100m-1.txt', type: 'csv_text', name: 'iso_bath', columns: 1, style: 'multi_line', geom_index: 0}
]

let initial_load = false;

async function someFunction() {
    const get_secondary = await fetchAll(obj_list, loader_notify).then(object_list => fetch_callback(object_list));
    const get_data = await fetchPOST(post_obj_list, loader_notify).then(object_list => fetch_callback(object_list));
    const get_last = draw_sectors();
    initial_load = true;
    return [get_data, get_secondary, get_last];
}

async function load_complete(situation) {

    // console.log(situation);
    // console.log(map_container);
    console.log('FINAL LOAD');
    adaptive_scaling_wudi();


    if (situation === 'true' && initial_load === true) {
        //adaptive_scaling_wudi();
        //obs_handler({R:situation, M:'fully loaded'});
        //console.log('has cake');
        //adaptive_scaling_wudi();
        //
        //
        // const model = await wudi_get_data('40');//.then(object_list => wudi_set_data(object_list[0]));
        // wudi_set_data(model[0])
        //const res = wudi_get_data('40').then(object_list => wudi_set_data(object_list[0]));
        //wudi_set_data(res[0]);
        //console.log(res);
        // const re_k = wudi_get_data('40').then(r => {
        //     console.log('B:', r);
        // });
    } else {
        //obs_handler({R:situation, M:'load complete(?)'});
    }
    // adaptive_scaling_wudi();
}




// 👉️ START EVERYTHING HERE
const delay = ms => new Promise(res => setTimeout(res, ms));

async function times_populate(){
    const years = document.getElementById('years_container');
    const months = document.getElementById('months_container');

    await vars.dom_time.populate('years');
    years.style.display = 'none';
    years.style.display = 'flex';

    await vars.dom_time.populate('months');
    months.style.display = 'none';
    //months.style.display = 'flex';
    //await delay(10);
    return true;
}

function load_secondary(r){
    vars.info.dom_element.classList.remove('hidden');
    obs.classList.remove('hidden');
    windowRedraw(true);

    init();
    animate();
    q_nav.init();
    // bounds.style.display = 'block';
    const k = someFunction().then(r => load_complete(r));
}


window.addEventListener('DOMContentLoaded', (event) => {
    // toggle_debug_tools_state(false);
    // bounds.style.display = 'none';
    console.log('DOM fully loaded and parsed');
    window.addEventListener('resize', windowRedraw);


    const finish_dom = times_populate().then(r => load_secondary(r));


});


