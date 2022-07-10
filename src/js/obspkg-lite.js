import * as THREE from 'three/build/three.module.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import {vars} from "./vars-lite";
import {dragControls} from './drags.js';
import {keyControls} from './keys.js';
//import * as MATS from "./materials";

import {loader as fetchAll} from './data-loader.js';

vars.data = {};

vars.info = {
    world_position: new THREE.Vector3(),
    screen_position: {
        a: new THREE.Vector2(),
        b: new THREE.Vector2(),
    },
    dom_element: null,
    text:'null',
    rect: null,
    init: function () {
        this.dom_element = document.getElementById('info-field');
        //this.dom_element.addEventListener('mouseup', this.hover, false);//{once: false, capture: false, passive: true});
        this.dom_element.querySelector('.info-head').innerHTML = this.text.toString();
        this.rect = this.dom_element.getBoundingClientRect();
    },
    hover: function(e) {
        this.style.color = '#FFFFFF';
        // return true;
        // e.bubbles = true;
        // e.preventDefault();
    },
    set_label_color: function(c) {
        this.dom_element.style.color = c;
    },
    set_position: function(x, y) {
        this.screen_position.a.set(x, y);
        this.rect = this.dom_element.getBoundingClientRect();
    },
    set_state: function(bool){
        this.dom_element.style.display = bool ? 'block':'none';
    },
    set_text: function(a=null, b=null){
        [['.info-head',a], ['.info-body',b]].forEach(t =>{
            if(t[1]) this.dom_element.querySelector(t[0]).innerHTML = Array.isArray(t[1]) ? t[1].join('</br>') : t[1].toString();
            this.dom_element.querySelector(t[0]).style.display = t[1] ? 'block':'none';
        });
    },
    update_position: function() {
        this.screen_position.b.lerp(this.screen_position.a, 0.1);
        this.dom_element.style.left = (this.screen_position.b.x - (this.rect.width / 2)).toFixed(2) + 'px';
        this.dom_element.style.top = (this.screen_position.b.y - (this.rect.height / 2)).toFixed(2) + 'px';
    },
}

vars.info.init();

const sprite_mat = (fill_color) => {
    const canvas = document.createElement('canvas');
    const size = 32;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const radius = (size-1)/2;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(radius, radius, radius, 0, (Math.PI*4)/2, false);
    ctx.fill();

    const amap = new THREE.Texture(canvas);
    amap.needsUpdate = true;

    return amap;
}


let ww, wh, camera, scene, renderer, stats, gridHelper, cube;
let map_container, map_plane, visible_dimensions, camera_distance, root_plane, pos_mark_1, pos_mark_2, pos_mark_3, pos_mark_4,
    arrow_helper, grid_lines, grid_resolution;
let cam_dot_y, cam_dot_x, cam_dot_z;
let active_keys = [];
let axis_planes = [];
let pos_marks_array = [];
let ticks = {};

const z_mants = [0.25, 0.5, 1.0, 2.0, 5.0, 10.0, 20.0];
let default_z = 10;
const test_bounds = [-5, 28, 35, 48];

const cube_box = new THREE.BoxGeometry(2, 2, 2);
cube = new THREE.Mesh(cube_box, new THREE.MeshStandardMaterial({color: 0xffffff}));
cube.rotateX(Math.PI / -2);
cube.updateMatrix();
cube.userData.originalMatrix = cube.matrix.clone();

const ray_caster = new THREE.Raycaster();
const intersects = new THREE.Vector3();
const cam_base_pos = new THREE.Vector3(0, 0, default_z);
const cam_pos = new THREE.Vector3(0, 0, 0);
const vk = new THREE.Vector3(0, 0, 0);
const vw = new THREE.Vector3(0, 0, 0);
const vu = new THREE.Vector3(0, 0, 0);
const vc = new THREE.Vector3(0, 0, 0);

const y_up = new THREE.Vector3(0, 1, 0);
const x_right = new THREE.Vector3(1, 0, 0);
const z_in = new THREE.Vector3(0, 0, 1);
const cam_right = new THREE.Vector3();
const mouse_plane_pos = new THREE.Vector3(0, 0, 0);
const mouse_pos_map = new THREE.Vector3(0, 0, 0);

vars.user.mouse.raw = new THREE.Vector3();
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
    vars.map = {
        offset: {
            x: map_center.x,
            y: map_center.y
        },
        dims: {
            w: map_dims.x,
            h: map_dims.y
        }
    }

    console.log(vars.map);
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
    const mat = new THREE[vars.materials.mapMarkersMaterial.type](vars.materials.mapMarkersMaterial.dict);
    mat.setValues({'side': THREE[vars.materials.mapMarkersMaterial.dict.side]});

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
        if (cam_base_pos.z < 0.5) {
            cam_base_pos.z = 0.5;
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
                //.map(e => vars.data[e.userData.data.name][e.userData.data.index][0]);
                //.forEach(e => e.userData.selected(true));
            if(eco.length) {
                const poly = eco[0];
                if (vars.user.selection && poly.id !== vars.user.selection) scene.getObjectById(vars.user.selection, true).userData.selected(false);
                vars.user.selection = poly.id;
                poly.userData.selected(true);
                vars.info.set_state(true);
                poly.geometry.boundingBox.getCenter(vw);
                map_container.localToWorld(vw);
                projected(vw);
                vars.info.set_position(vw.x, vw.y);
                vars.info.set_label_color('#'+poly.material.color.getHexString());
                const data = vars.data[poly.userData.data.name].raw[poly.userData.data.index];
                vars.info.set_text(data[2], [data[4],data[6],`id:${data[0]}`]);
            }else{
                if (vars.user.selection ) scene.getObjectById(vars.user.selection, true).userData.selected(false);
                vars.user.selection = null;
                vars.info.set_state(false);
            }

            obs_handler({
                E: vars.user.selection,
                M: mouse_pos_map.toArray().map(e => e.toFixed(2)).join(', '),
            });
        }

        //basic touches
        ray_caster.setFromCamera(vars.user.mouse.raw, camera);
        const intersects = ray_caster.intersectObjects(scene.children, true).filter(i => i.object.name !== '');
        obs_handler({IN: [...new Set(intersects.map(e => e.object.name+'-'+e.index))].join('</br>')});
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
        });
    }

    run_camera();
    let zg = Math.floor(Math.log(camera_distance)) + 1;
    grid_resolution = z_mants[zg];
    run_ticks();

    ray_caster.setFromCamera(vars.user.mouse.raw, camera);
    ray_caster.ray.intersectPlane(root_plane, intersects);
    mouse_plane_pos.set(intersects.x, intersects.y, intersects.z);
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

function init() {
    camera = new THREE.PerspectiveCamera(45, ww / wh, 0.1, 1000);
    scene = new THREE.Scene();
    scene.background = new THREE.Color('#1d2733');

    vars.user.group = new THREE.Group();

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

    pos_marks_array = [pos_mark_1, pos_mark_2, pos_mark_3, pos_mark_4];
    pos_marks_array.forEach(p => {
        scene.add(p);
        p.visible = true;
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

    map_container = make_map_container(test_bounds);
    scene.add(map_container);
    map_plane.visible = false;

    dragControls(renderer.domElement, translateAction, cube, {passive: true});
    keyControls(window, keyAction);

    grid_lines = make_grid_lines();
    scene.add(grid_lines);
    plot.appendChild(renderer.domElement);

    visible_dimensions = visibleAtZDepth(-default_z, camera);
    cam_base_pos.z = ((default_z / visible_dimensions.w) * vars.map.dims.w) + 2.0;

    let zg = Math.floor(Math.log(cam_base_pos.z)) + 1;
    grid_resolution = z_mants[zg];


    // const sp = new THREE.Sprite(sprite_mat('#ffffff'));
    // sp.material.setValues({color:0xff00ff});
    // sp.scale.set( 1, 1, 1 ); // CHANGED
    // sp.name = 'spritely';
    // scene.add(sp);

    ray_caster.params.Line.threshold = 0.1;//025;
    ray_caster.params.Points.threshold = 0.1;//025;

    run_camera();
    run_ticks();

}

function animate() {
    requestAnimationFrame(animate);
    vars.info.update_position();
    render();
    stats.update();
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
    user_position_round.copy(user_position).round();
    grid_lines.position.copy(user_position);
    pos_mark_2.position.copy(user_position_round);

    //visible_dimensions = visibleAtZDepth(-camera_distance, camera);
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

function do_run_test_plot(obj) {
    const keys = vars.data[obj.name].raw[0];
    console.log(keys.map((k, i) => {return `${i}:${k}`}));
    let group;
    let mat = null;

    if(obj.style === 'point'){
        //#//for datasets with coordinate geometries
        const material = new THREE.PointsMaterial({
            size: 0.1,
            map: sprite_mat('#FFFFFF'),
            color:0xFFFFFF,
            blending: THREE.AdditiveBlending,
            depthTest: false,
            transparent: true
        });
        //const material = new THREE.PointsMaterial( { size: 10.0, map: mat.map, blending: THREE.AdditiveBlending, depthTest: false, transparent: false } );
        let vertices = [];
        for(let i = 1; i < vars.data[obj.name].raw.length; i++){
            if(Array.isArray(obj.geom_index)){
                vertices.push(vars.data[obj.name].raw[i][obj.geom_index[0]]);
                vertices.push(vars.data[obj.name].raw[i][obj.geom_index[1]]);
                vertices.push(0.0);
            }else{
                vertices.push(vars.data[obj.name].raw[i][obj.geom_index][0]);
                vertices.push(vars.data[obj.name].raw[i][obj.geom_index][1]);
                vertices.push(0.0);
            }
        }
        // const buf = new Float32Array.from(points);
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( vertices, 3 ) );
        group = new THREE.Points( geometry, material );
        group.name = obj.name;
        console.log(vertices);
        //return;
    }else{
        //#//for datasets with polygonal geometries
        //#//MAKE WORK FOR MULTIPOLYS
        group = new THREE.Group();
        group.name = obj.name;
        vars.data[obj.name].raw.forEach((l_obj, i) => {
            if (i > 0) {
                let element;
                const geom_obj = l_obj[10];
                const exterior = array_to_xy(geom_obj.out);

                if(obj.style === 'mesh'){
                    const out_points = exterior.points2;
                    const in_shapes = geom_obj.in.map(i => new THREE.Shape(array_to_xy(i).points2));
                    const polygon_shape = new THREE.Shape(out_points);
                    if (in_shapes.length) polygon_shape.holes = in_shapes;
                    const geometry = new THREE.ShapeBufferGeometry(polygon_shape);
                    const material = new THREE.MeshBasicMaterial({color: 0xffffff});
                    element = new THREE.Mesh(geometry, material);
                }else if(obj.style === 'line'){
                    const geometry = new THREE.BufferGeometry().setFromPoints( exterior.points3 );
                    const material = new THREE.LineBasicMaterial({color: vars.colors[obj.name].select[0]});
                    element = new THREE.LineLoop( geometry, material );
                    element.name = `eco${vars.data[obj.name].raw[i][0]}`;
                }

                element.userData.x_coords = exterior.x;
                element.userData.y_coords = exterior.y;
                element.userData.data = {name: obj.name, index: i};
                element.userData.selected = (state) =>{
                    element.material.setValues({color:vars.colors[obj.name].select[+state]});
                    element.position.setZ(+state*0.01);
                    return state;
                }
                element.geometry.computeBoundingBox();
                group.add(element);
            }
        })

    }

    map_container.add(group);
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

function render() {
    //#//yes yer doing it.
    renderer.render(scene, camera);
}

function windowRedraw() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    ww = w;
    wh = h - 40;
    plot.style.width = (w) + 'px';
    plot.style.height = (h - 40) + 'px';
    vars.view.width = ww;
    vars.view.height = wh;

    if (camera) {
        camera.aspect = ww / wh;
        camera.updateProjectionMatrix();
        renderer.setSize(ww, wh);
    }

}

//console.log(arr); // 👉️ ['One', 'Two', 'Three', 'Four']
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

        do_run_test_plot(obj);
    });
    console.log(vars.data);

    // do_run_test_plot('wudi', 'point');
}

//START EVERYTHING HERE
window.addEventListener('resize', windowRedraw);
windowRedraw(null);
init();
animate();


const obj_list = [
    {url:'./data/raw-wudi-9.txt', type: 'csv_text', name:'wudi', columns: 9, style:'point', geom_index: [1, 0]},
    {url:'./data/raw-protected-15.txt', type: 'csv_text', name:'protected_no_geom', style:'point', columns: 15, geom_index: 12},
    {url: './data/raw-georegions-11.txt', type: 'csv_text', name: 'eco_regions', columns: 11, style:'line', geom_index:10}
]

fetchAll(obj_list).then(object_list => fetch_callback(object_list));


// const myText = fetch_obj_async('./data/raw-wudi-9.txt', {type: 'csv_text', name:'wudi', columns: 9}, fetch_obj_async_callback);
// const myJson = fetch_obj_async('./data/test.json', {type: 'json', name:'json_test'}, fetch_obj_async_callback);
//





