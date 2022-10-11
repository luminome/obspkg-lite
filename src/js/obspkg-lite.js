import * as THREE from 'three/build/three.module.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import {vars} from "./vars-lite";
import {dragControls} from './drags-lite-beta.js';
import {keyControls} from './keys.js';
import * as util from './obspkg-lite-util.js';
import {loader as fetchAll} from './data-loader.js';
import {post_loader as fetchPOST} from './data-loader.js';
//import {norm_val, title_case, to_lexical_range} from "./obspkg-lite-util.js";
import {graph} from "./obspkg-lite-dom-graph-util";

// import {Line2} from 'three/examples/jsm/lines/Line2.js';
// import {LineMaterial} from "three/examples/jsm/lines/LineMaterial";
// import {LineGeometry} from "three/examples/jsm/lines/LineGeometry";

document.body.style['background-color'] = vars.colors.hex_css(vars.colors.window);

vars.data = {};

vars.info = {
    lock_position: new THREE.Vector3(),
    target_lock:false,
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
            if(this.target_lock){
                this.dom_element.style['pointer-events'] = 'all';
                this.dom_element.classList.add('select');
                x = this.lock_position.x;
                y = this.lock_position.y;
            }else{
                this.dom_element.classList.remove('select');
                this.dom_element.style['pointer-events'] = 'none';
            }
            let px, py;
            const offset = 10;
            if(y - (this.rect.height / 2) < 0){
                //too far up
                px = x;
                py =  y + (this.rect.height / 2) + offset;
            }else if (y + (this.rect.height / 2) > vars.view.height) {
                //too far down
                px = x;
                py = y - (this.rect.height / 2) - offset;
            }else if (x + this.rect.width + offset > vars.view.width) {
                //too far right
                px = x - (this.rect.width / 2) - offset;
                py = y;
            }else{
                px = x + (this.rect.width / 2) + offset;
                py = y;
            }

            this.screen_position.a.set(px,py);
            this.screen_position.b.set(px,py);

        }
        // this.dom_element.style.left = (this.screen_position.a.x - (this.rect.width / 2)).toFixed(2) + 'px';
        // this.dom_element.style.top = (this.screen_position.a.y - (this.rect.height / 2)).toFixed(2) + 'px';

    },
    drag_position: function (delta_x, delta_y) {
        vw.set(delta_x, delta_y);
        this.screen_position.a.add(vw);
        // this.dom_element.style.left = (this.screen_position.a.x - (this.rect.width / 2)).toFixed(2) + 'px';
        // this.dom_element.style.top = (this.screen_position.a.y - (this.rect.height / 2)).toFixed(2) + 'px';
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
            if(d.hasOwnProperty('table')){
                part.querySelector('.info-head').innerHTML = d.head;
                part.querySelector('.info-text').classList.add('info-table');
                d.table.map(r => {
                    const row = document.createElement('div');
                    r.map(tx => {
                        const txt_div = document.createElement('div');
                        txt_div.className = 'info-cell';
                        txt_div.innerHTML = `<span>${tx}</span>`;
                        row.appendChild(txt_div);
                    });
                    row.className = 'info-row';
                    part.querySelector('.info-text').appendChild(row);
                })
            }else{
                [['.info-head', d.head], ['.info-text', d.hasOwnProperty('text') ? d.text : null]].forEach(t => {
                    if (t[1]) part.querySelector(t[0]).innerHTML = Array.isArray(t[1]) ? t[1].map(t_l => {
                        return `<span>${t_l}</span>`
                    }).join(''): t[1].toString();
                    part.querySelector(t[0]).style.display = t[1] ? 'block' : 'none';
                });
            }
            this.display_element.appendChild(part);
        }
        this.rect = this.dom_element.getBoundingClientRect();
    },
    update_position: function () {
        // if(this.target_lock){
        //     vu.copy(this.lock_position);
        //     projected(vu);
        //     this.screen_position.a.set(vu.x,vu.y);
        // }

        //this.screen_position.b.lerp(this.screen_position.a, 0.3);
        this.dom_element.style.left = (this.screen_position.b.x - (this.rect.width / 2)).toFixed(2) + 'px';
        this.dom_element.style.top = (this.screen_position.b.y - (this.rect.height / 2)).toFixed(2) + 'px';
    },
}

vars.info.init();

vars.selecta = {
    hover_intersections: [],
    intersect: null,
    focus_obj: null,
    moved: null,
    touch: {
        select: false,
        clicked: null,
    },
    wudi: {
        times: {years: ['all'], months: ['all'], has_default: 'all', selected: [], loaded: [], required: []},
        points: {canonical_selection: [], hover: [], selected: [], dom_handles:[]},
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

            //console.log('this.times', this.times);

            wudi_get_data(this.times.required);

            obs_handler({'T': Object.entries(this.times)});

            vars.dom_time[type].map((y) => y.set_state(this.times[type].includes(y.data)));

            if (this.times.years[0] !== 'all') {
                const years_grp = [...this.times.years];
                const months_grp = [...this.times.months];

                //Y: u/d days per year
                //M: u/d days (August) 2003
                //Ds: daily WUDI values
                //Y: u/d days month of x

                const n_months = util.to_lexical_range(months_grp, 'mo');//.toString();//.trim();
                ///alert(`-${months}-${util.to_lexical_range(years_grp)}`);
                //alert(months.length);
                // console.log(n_months);
                title.innerHTML = n_months[0] !== undefined ? n_months + ' ' + util.to_lexical_range(years_grp) : util.to_lexical_range(years_grp);

                document.getElementById('months_container').style.display = 'flex';
                //document.getElementById('years_container').style.height = '24px';
                //if(vars.view.init_state)
                window_redraw();
            }else{
                title.innerHTML = '1979 to 2020';
                document.getElementById('months_container').style.display = 'none';
                //document.getElementById('years_container').style.height = '48px';
                //if(vars.view.init_state)
                window_redraw();
            }

        },
        points_deselect: function (){
            vars.selecta.wudi.points.selected.map(pt => {
                wudi_point_select_state(pt, false, true);
            });
            vars.selecta.wudi.points.dom_handles.map(dh => {
                dh.dom_delete();
            });
            vars.selecta.wudi.points.selected = [];
            vars.selecta.wudi.points.dom_handles = [];
            graph_bar.style.display = 'none';
            window_redraw();
            return false;
        },
        point_select: function (pid) {
            const pos = this.points.selected.indexOf(pid);
            // console.log(pos);

            if (pos === -1) {
                this.points.selected.push(pid);
                //wudi_point_select_state(vars.selecta.wudi.points.hover[0], true, true);
                //wudi_point_select_state(pid, true, true);
                //move_map_to_point(pid);
                //move_to_point(pid);
                const rpt = new wudiSelectionDomMark(pid);
                this.points.dom_handles.push(rpt);
                rpt.draw();
                //
            } else {
                this.points.selected.splice(pos, 1);
                this.points.dom_handles[pos].dom_delete();
                this.points.dom_handles.splice(pos, 1);
                //wudi_point_select_state(vars.selecta.wudi.points.hover[0], false, true);
                //wudi_point_select_state(pid, false, true);
            }
            //#// where to put graph option?
            wudi_get_point_detail(this.points.selected).then(r => {
                return r;
            })
            //wudi_get_point_detail(this.points.selected);
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
    //#// herein lies the changeover to MPA as sectorized data: in "draw()"
    constructor(id, loc, bounds) {
        this.id = id;
        this.name = `Sector-${id}`;
        this.path = `${vars.static_path}/${vars.degree_scale_str}/${this.name}`;
        this.loc = loc;
        this.bounds = bounds;
        this.level = 0;
        this.max_level = 0;
        this.center = new THREE.Vector3();
        this.group = new THREE.Group();
        this.objects = {};
        this.enabled = vars.sector_draw ? vars.layers.allow : [];
        this.meta = null;
        this.disabled = [];
        this.init();
    }

    draw(object) {

        if (object.name === 'line_strings') {
            //const mat = new THREE[vars.mats.line_strings.type](vars.mats.line_strings.dict);

            const material = new THREE.ShaderMaterial({
                uniforms: {
                  level: {
                    value: vars.line_strings_engage_distance,
                  },
                  color: {
                    value: new THREE.Color(vars.mats.line_strings.dict.color) //;//.fromArray(datum.color[0]),
                  }
                },
                vertexShader: document.getElementById('map-lines-vertex-Shader').textContent,
                fragmentShader: document.getElementById('map-lines-fragment-Shader').textContent,
                side: THREE.FrontSide,
                transparent: true,
                blending: THREE.AdditiveBlending,
                depthTest: false,
                depthWrite: false,
            });

            material.needsUpdate = true;
            material.uniformsNeedUpdate = true;

            //mat.setValues({color: vars.colors.eco_regions.select[1]});
            const lines_group = new THREE.Group();
            const coord_arrays = coords_from_array(object.raw);

            for (let vertices of coord_arrays) {
                const geometry = new THREE.BufferGeometry();
                geometry.setAttribute('position', new THREE.BufferAttribute(Float32Array.from(vertices), 3));
                const contour = new THREE.Line(geometry, material);
                lines_group.add(contour);
            }
            lines_group.name = 'line_strings';
            lines_group.userData.level = object.level;
            lines_group.userData.enabled = true;
            lines_group.userData.type = 'line_strings';
            this.group.add(lines_group);
        }

        if (object.name === 'contours') {
            // const mat = new THREE[vars.mats.contours.type](vars.mats.contours.dict);

            const bath_o_mat = new THREE.ShaderMaterial({
                uniforms: {
                  depth: {
                    value: vars.depth_engage_distance
                  },
                  color: {
                    value: new THREE.Color(vars.mats.contours.dict.color),  //new THREE.Color(vars.colors.contours.base),
                  },
                    baseColor: {
                        value: new THREE.Color(vars.colors.window)
                    }
                },
                vertexShader: document.getElementById('bathos-vertex-Shader').textContent,
                fragmentShader: document.getElementById('bathos-fragment-Shader').textContent,
                // transparent: true,
                // blending: THREE.AdditiveBlending, ///AdditiveBlending,
                // depthTest: false,
                // depthWrite: false,
            });

            const contours = new THREE.Group();
            object.raw.map(obj => {
                const contour_depth = new THREE.Group();
                const coord_arrays = coords_from_array(obj['line_strings'], obj['d'] / -vars.depth_max);
                ///console.log(obj['d'] / -vars.depth_max);

                for (let vertices of coord_arrays) {
                    // const colors = new Float32Array(vertices.length * 3);
                    // for (let i = 0; i<colors.length; i++) {
                    //     colors[i] = 1.0-(obj['d'] / vars.depth_max);
                    // }

                    const geometry = new THREE.BufferGeometry();
                    geometry.setAttribute('position', new THREE.BufferAttribute(Float32Array.from(vertices), 3));
                    geometry.deleteAttribute('uv');
                    geometry.deleteAttribute('normal');
                    //geometry.computeVertexNormals();
                    ///geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3, true));
                    const contour = new THREE.Line(geometry, bath_o_mat);
                    contour_depth.add(contour);
                }

                contour_depth.name = 'contours';
                contour_depth.userData.depth = obj['d'];
                contour_depth.userData.level = object.level;
                contour_depth.position.set(0,0,-0.0025);
                contours.add(contour_depth);
            });
            contours.name = 'contours';
            contours.userData.level = object.level;
            contours.userData.enabled = true;
            contours.userData.type = 'contours';
            this.group.add(contours);

        }

        if (object.name === 'mpa_s'){

            const mpa_mat = new THREE[vars.mats.mpaMaterial.type](vars.mats.mpaMaterial.dict);
            mpa_mat.blending = THREE.AdditiveBlending;

            object.raw.map(obj => {
                const this_mpa_s = new THREE.Group();
                const ref = vars.refs.mpa_s[obj['id']];

                obj['line_strings'].map((mpa,n) =>{
                    const shape = shape_from_array(mpa);
                    const geometry = new THREE.ShapeBufferGeometry(shape);
                    const t_mat = mpa_mat.clone();
                    const t_color = ref.STATUS_ENG === 'Designated' ? vars.colors.mpa_s_designated: vars.colors.mpa_s_proposed;
                    t_mat.color = new THREE.Color().fromArray(t_color);
                    t_mat.opacity = t_color[3];
                    const mesh = new THREE.Mesh(geometry, t_mat);
                    mesh.userData.is_part = true;
                    mesh.name = obj['id']+'_'+n;
                    this_mpa_s.add(mesh);
                })

                const outlines = coords_from_array([obj['line_strings']]);
                this_mpa_s.userData.mpa_s_outlines = outlines;
                this_mpa_s.userData.area = ref.REP_AREA ? ref.REP_AREA: 0.0;
                this_mpa_s.userData.index = obj['id'];
                this_mpa_s.userData.level = object.level;
                this_mpa_s.name = 'mpa_s-'+obj['id'];
                this_mpa_s.userData.type = 'mpa_s';
                this.group.add(this_mpa_s);
                // this.group.add(mesh);

            });

            // mpa_s.name = 'mpa_s';//+obj['id'];
            // mpa_s.userData.level = object.level;
            // this.group.add(mpa_s);
        }

        if (object.name === 'polygons'){

            const polygons_material = new THREE.ShaderMaterial({
                uniforms: {
                    level: {
                    value: vars.polygons_engage_distance,
                    },
                    auxCameraPosition: {
                      value: camera_map_local
                    },
                    color: {
                        value: new THREE.Color(vars.mats.polygonsMaterial.dict.color)
                    },
                    baseColor: {
                        value: new THREE.Color(vars.colors.window)
                    }
                },
                vertexShader: document.getElementById('map-polygons-vertex-Shader').textContent,
                fragmentShader: document.getElementById('map-polygons-fragment-Shader').textContent,
                side: THREE.FrontSide,
                // transparent: true,
                // blending: THREE.AdditiveBlending,
                // depthTest: false,
                depthWrite: true,
            });
            const polygons = new THREE.Group();

            object.raw.map(obj => {
                for(let poly of obj){
                    const shape = shape_from_array(poly);
                    const geometry = new THREE.ShapeBufferGeometry(shape);
                    const mesh = new THREE.Mesh(geometry, polygons_material);
                    polygons.add(mesh);
                }
            });

            polygons.userData.level = object.level;
            polygons.userData.enabled = true;
            polygons.userData.type = 'polygons';
            polygons.name = object.name;
            this.group.add(polygons);
            this.group.position.setZ(-0.001);
        }

        return true;
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
                    this.meta[k[0]].max_loaded = 0;
                } else {
                    delete this.meta[k[0]];
                }
            });

        // const recap = Object.keys(this.meta);//.map(m => );
        // if ((recap.length === 1 && recap[0] === 'polygons') || !recap.length) this.self_destruct();

        return true;
    }

    test_validate(){

        return this.group.children.filter(r => r.visible).map(res => {
            return res.name+' '+res.userData.level;
        });
        //
        // const summary = [this.level, this.max_level];
        // for (let obj of Object.keys(this.meta)) {
        //     summary.push(obj);
        //     summary.push(Object.entries(this.meta[obj]))
        // }
        // return summary;
    }

    load_layers(obj_list) {
        for (let obj of obj_list) {
            this.draw(obj);
            //console.log(obj.name, obj.level);
            this.meta[obj.name][obj.level] = 'loaded';
            this.meta[obj.name].max_loaded = obj.level;
            this.max_level = obj.level > this.max_level ? obj.level : this.max_level;
            this.update();
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
       //  if(objects_list.length) fetchAll(objects_list).then(object_list => this.load_layers(object_list));
    }

    init() {
        const material = new THREE.LineBasicMaterial({color: 0xffffff, transparent: true, opacity: 0.125, blending: THREE.AdditiveBlending});
        const geometry = new THREE.BufferGeometry().setFromPoints(this.bounds);
        geometry.setIndex([0, 1, 2, 2, 3, 0]);
        geometry.computeVertexNormals();
        geometry.computeBoundingBox();
        geometry.boundingBox.getCenter(this.center);

        const plane_line = new THREE.Mesh(geometry, material);
        plane_line.name = 'plane_line';//-'+this.id;// + `(${this.loc.toString()})`;
        plane_line.userData.index = this.id;
        plane_line.userData.center = this.center;
        //plane_line.name =
        if(vars.DEBUG) {
            this.group.add(plane_line);
        }

        this.group.userData.center = this.center;
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

            const c_level = this.max_level >= LV;
            this.level = LV;
            if(vars.DEBUG) {
                this.objects.plane.material.setValues({opacity: (this.level / vars.levels) * 0.125});
                //this.objects.plane.name = 'plane_line-'+this.id;// + `(${this.loc.toString()})`;`plane_line-${this.id}-(${this.level})`;
                this.objects.plane.userData.level = this.level;//+' '+this.max_level;
                this.objects.plane.userData.aux = [this.max_level];
            }
            this.check_layers();
            if(c_level) this.update();
        }
    }

    update() {
        this.group.children.forEach(res => {
            if(this.disabled.includes(res.userData.type)) {
                res.visible = false;
                return;
            }
            if(this.meta.hasOwnProperty(res.name) && this.meta[res.name][this.level] === null) return;
            res.visible = (res.userData.level === this.level);
            //if(res.name === 'contours' && res.userData.level < 1) res.visible = false;
        });
    }

    toggle_attribute(attribute_name, set_state){

        const pos = this.disabled.indexOf(attribute_name);
        if(pos === -1){
            this.disabled.push(attribute_name);
        }else{
            this.disabled.splice(pos, 1);
        }

        this.update();

        //
        //
        // console.log('this.disabled', this.disabled, attribute_name);
        //
        // this.group.children.forEach(res => {
        //     if(res.name.indexOf(attribute_name) !== -1){
        //         res.userData.enabled = set_state;
        //         res.visible = set_state;
        //     }
        // });
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

class wudiSelectionDomMark {
    //list of objects tied to selecta.wudi;
    constructor(pid){
        this.pid = pid;
        this.world_pos = new THREE.Vector3();
        this.point_data = null;
        this.pos = new THREE.Vector3();
        this.dom_element = null;
        this.init();
    }

    init(){
        //alert(vars.data.wudi_index);
        const ref_point = vars.data.wudi_index.indexOf(this.pid);
        this.point_data = vars.data.wudi_points.raw.data[ref_point];

        vw.set(this.point_data[1],this.point_data[0],0.0);
        vk.set(this.point_data[5],this.point_data[4],0.0);
        vu.subVectors(vk,vw).multiplyScalar(0.5).add(vw);

        this.world_pos.copy(vu);
        map_container.localToWorld(this.world_pos);

        const el = document.getElementById('wudi-selection-temp').cloneNode(true);
        el.classList.remove('hidden');
        el.setAttribute('data-pid', this.pid);

        const el_label = el.getElementsByClassName('label')[0];
        const el_marker = el.getElementsByClassName('marker')[0];

        el_label.innerHTML = "Nº"+this.pid;
        plot.appendChild(el);

        const dk = el_label.getBoundingClientRect();
        el_label.style.left = (dk.width/-2)+'px';
        el_marker.style.height = vars.wudi_selecta_stem_pixels+'px';


        this.dom_element = el;

    }


    dom_delete(){
        plot.removeChild(this.dom_element);
    }

    draw(){
        this.pos.copy(this.world_pos);
        projected(this.pos);

        this.dom_element.style.left = (this.pos.x)+'px';
        this.dom_element.style.top = (this.pos.y-vars.wudi_selecta_stem_pixels)+'px';

    }
}

class dataClass {
    constructor(pid){
        this.id = pid;
        return this;
    }
    set(keys, values){
        for(let i=0; i<keys.length;i++){
            this[keys[i]] = values[i];
        }
        return this;
    }
}


vars.dom_time = {
    years: [],
    months: [],
    populate: async function (type) {
        if (type === 'years') {
            const test_time = new domTimeElement(0, 'years', 'YEARS', 'all', true);
            this.years.push(test_time);
            for (let t = 1980; t < 2021; t++) {
                const label = t.toString().substr(2, 2);
                const test_time = new domTimeElement(t, 'years', label, t);
                this.years.push(test_time);
            }
            vars.selecta.wudi.times_select('years');
        } else if (type === 'months') {
            const test_time = new domTimeElement(0, 'months', 'MONTHS', 'all', true);
            this.months.push(test_time);
            for (let t = 1; t < 13; t++) {
                // const label = String(t).padStart(2, '0');
                const label = util.months_str[t-1];//String(t).padStart(2, '0');
                const test_time = new domTimeElement(t, 'months', label, t);
                this.months.push(test_time);
            }
            vars.selecta.wudi.times_select('months');
        }
        return true;
    }
}

let pki = 0 ;

vars.user.mouse.raw = new THREE.Vector3(0, 0, 0);
vars.sectors_loaded = false;
vars.loader_notify = {ct: 0, list: []};

const bounds = document.getElementById('bounds');
const plot = document.getElementById('plot');
const plot_ticks = document.getElementById('plot-ticks');
const plot_controls = document.getElementById('plot-controls');
const obs = document.getElementById('obs');
const title = document.getElementById('title');
const title_bar = document.getElementById('title-bar');
const intro_box = document.getElementById('intro-box');
const x_major_axis = document.getElementById('x-axis');
const y_major_axis = document.getElementById('y-axis');
const graph_bar = document.getElementById("graph-obj-bar");
const q_nav_bar = document.getElementById("q-nav-bar");
const output = document.getElementById("output");
const page_handle = document.getElementById("page-handle-icon");

let camera, scene, renderer, stats, gridHelper, cube;
let map_container, map_plane, visible_dimensions, camera_distance, root_plane, pos_mark_1, pos_mark_2, pos_mark_3, pos_mark_4,
    axes_helper, arrow_helper_1, arrow_helper_2, arrow_helper_3, arrow_helper_4, grid_lines, grid_resolution, map_sectors_group, ref_marker, ref_marker_2;
let cam_dot_y, cam_dot_x, cam_dot_z, camera_scale;
let active_keys = [];
let axis_planes = [];
let pos_marks_array = [];
let ticks = {};

let ww = window.innerWidth;
let wh = window.innerHeight;
console.log(ww, wh);

const z_mants = [0.25, 0.5, 1.0, 2.0, 5.0, 10.0, 20.0];
let default_z = 20;
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
const wudi_type_array = [{item:'upwelling',label:'up'}, {item:'downwelling',label:'down'}];

const ray_caster = new THREE.Raycaster();
const cam_base_pos = new THREE.Vector3(0, 0, default_z);
const cam_pos = new THREE.Vector3(0, 0, 0);
const camera_projected = new THREE.Vector3(0, 0, 0);
const camera_map_local = new THREE.Vector3(0, 0, 0);
const vk = new THREE.Vector3(0, 0, 0);
const vw = new THREE.Vector3(0, 0, 0);
const vu = new THREE.Vector3(0, 0, 0);
const vc = new THREE.Vector3(0, 0, 0);

const axis_dir_x = new THREE.Vector3(0, 0, 1);
const axis_dir_y = new THREE.Vector3(-1, 0, 0);

const mu = new THREE.Matrix4();
const mu_i = new THREE.Matrix4();

const qu = new THREE.Quaternion();

const y_up = new THREE.Vector3(0, 1, 0);
const x_right = new THREE.Vector3(1, 0, 0);
const z_in = new THREE.Vector3(0, 0, 1);
const cam_right = new THREE.Vector3(0, 0, 0);
const mouse_plane_pos = new THREE.Vector3(0, 0, 0);
const mouse_pos_map = new THREE.Vector3(0, 0, 0);


const user_position = {
    actual: new THREE.Vector3(0, 0, 0),
    round: new THREE.Vector3(0, 0, 0),
    move_to(pos) {

    }
}

// const user_position.actual = new THREE.Vector3(0, 0, 0);
// const user_position.round = new THREE.Vector3(0, 0, 0);
const mouseDownCameraPosition = new THREE.Vector3(0, 0, 0);

const lastMouseDown = new THREE.Vector3(0, 0, 0);
const newMouseDown = new THREE.Vector3(0, 0, 0);
const m_ray_origin = new THREE.Vector3(0, 0, 0);
const m_ray_pos = new THREE.Vector3(0, 0, 0);
const m_ray_dir = new THREE.Vector3(0, 0, 0);

const camera_frustum = new THREE.Frustum();
const camera_frustum_m = new THREE.Matrix4();
const axis_markers_count = 21;

const m_selection_outlines = new THREE.Group();

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

const shape_from_array = (array) =>{
    const exterior_points = [];
    for (let p = 0; p < array.length; p += 2) {
        exterior_points.push(new THREE.Vector2(array[p]*1.0, array[p + 1]*1.0));
    }
    return new THREE.Shape(exterior_points);
}

const coords_from_array = (array, add_z = 0.0) => {
    const build_coords = (coords_flat) => {
        let buffer = [];
        if(Array.isArray(coords_flat)) {
            for (let i = 0; i < coords_flat.length; i += 2) {
                buffer.push(coords_flat[i], coords_flat[i + 1], add_z);
            }
        }
        return buffer;
    }

    let coords = [];
    for (let a of array) {
        if (a.length === 1) {
            coords.push(build_coords(a[0]));
        } else {
            for (let b of a) {
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


const element_info_filter_secondary = {
    mpa_s: (index = null) => {
        const ref = vars.refs.mpa_s[parseInt(index)];
        const readable = vars.keys_table.mpa_s(ref);
        return {
            head: ref.NAME,
            table: Object.entries(readable).filter(m => m[1] !== null),
        }
    },
    places_data: (index = null) => {
        const ref = vars.refs.places_data[parseInt(index)];
        const ref_geo = vars.refs.geonames[ref.geo] !== undefined ? vars.refs.geonames[ref.geo].GEONAME : null;
        const readable = vars.keys_table.places_data(ref, ref_geo);
        return {
            head: ref.name,
            table: Object.entries(readable).filter(m => m[1] !== null),
        }
    }
}

const element_info_filter = {
    plane_line: (index = null) => {
        const sector = map_sectors_group.children[index].userData.owner;
        // const plane = scene.getObjectByName('plane_line-' + index);
        // const ske = plane.parent.userData.owner;
        if(vars.DEBUG){
            return {
                text: sector.test_validate(), ///['plane' + index, plane.userData.level, plane.userData.aux],
                index: index,
                name: 'plane_line'+'-'+index
            }
        }else{
            return null;
        }

    },
    mpa_s: (index = null) => {

        const ref = vars.refs.mpa_s[parseInt(index)];
        const name = Array.isArray(ref.NAME) ? ref.NAME : util.title_case(ref.NAME);

        //console.log(figure);
        //console.log(index+1, figure, vars.data.mpa_s);
        return {
            head: name,
            text: [ref.COUNTRY, ref.STATUS_ENG+'—'+ref.STATUS_YR, ref.DESIG_ENG],
            index: index,
            name: 'mpa_s'+'-'+index,
            area: ref.REP_AREA ? ref.REP_AREA : 0,
            type: 'mpa_s'
        }
    },
    isobath: (index = null) => {
        return {
            text: 'isobath 100m',  // + index,
            index: index,
            name: 'isobath'+'-'+index,
            area: 10000000,
            type: 'isobath'
        }
    },
    wudi_points: (index = null) => {
        const data_index = vars.data.wudi_index[index];
        // if (vars.selecta.wudi.points.hover.length) wudi_point_select_state(vars.selecta.wudi.points.hover[0], false);
        // wudi_point_select_state(data_index, true);
        vars.selecta.wudi.points.hover = [data_index];
        const point_info = get_point_selection_state([data_index], index);

        return {
            head: point_info.head,
            text: point_info.text,
            index: index,
            name: 'wudi_points'+'-'+index,
            area: 0,
            type: 'wudi_points'
        }
    },
    wudi_up: (index = null) => {
        return element_info_filter.wudi_points(index);
    },
    wudi_down: (index = null) => {
        return element_info_filter.wudi_points(index);
    },
    places_data: (index = null) => {

        const ref = vars.refs.places_data[parseInt(index)];
        const ref_name = Array.isArray(ref.name) ? util.title_case(ref.name[0]) : util.title_case(ref.name);
        const ref_geo = vars.refs.geonames[ref.geo] !== undefined ? vars.refs.geonames[ref.geo].GEONAME : null;

        const ref_data = [
            ref.countryLabel,
            (ref_geo === ref.countryLabel || ref.geo === 1) ? null : ref_geo,
            (ref.countryLabel === ref.regionLabels) ? null : ref.regionLabels,
            `${ref.type} pop. ${ref.population}`
        ]

        return {
            head: ref_name,
            text: ref_data.filter(m => m !== null),
            index: index,
            name: 'places_data'+'-'+index,
            area: ref.area ? ref.area : 0,
            type: 'places_data'
        }
    }
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
        //document.body.appendChild(mark);
        plot_ticks.appendChild(mark);
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
    const v = new Float32Array(21);
    let int = ((Math.PI * 2) / 6);
    for (let i = 0; i < v.length; i += 3) {
        v[i] = (Math.cos((i / 3) * int)) * scale;
        v[i + 1] = (Math.sin((i / 3) * int)) * scale;
        v[i + 2] = 0.0;
    }
    const a_geometry = new THREE.BufferGeometry();
    a_geometry.setAttribute('position', new THREE.BufferAttribute(v, 3));
    a_geometry.setIndex([0, 1, 2, 2, 3, 0, 3, 4, 5, 5, 0, 3]);
    a_geometry.rotateZ(Math.PI/2);
    return a_geometry;
}

function make_markers_group() {
    const markers_group = new THREE.Group();
    const mat = new THREE[vars.mats.mapMarkersMaterial.type](vars.mats.mapMarkersMaterial.dict);
    mat.setValues({'side': THREE[vars.mats.mapMarkersMaterial.dict.side]});
    const a_geometry = make_hexagonal_shape();

    for (let n = 0; n < axis_markers_count; n++) {
        const hexagon = new THREE.Mesh(a_geometry, mat);
        hexagon.rotateZ(Math.PI / -2);
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

function apply_adaptive_scale(inst, v, v_lim, index, sign, a_lim) {
    //#//TODO must re-normalize to scale.
    inst.getMatrixAt(index, mu);
    mu.decompose(vw, qu, vu);
    const value = a_lim === 0 || v === 0 ? (0.0001) : (v / a_lim*sign);//v*Math.sign(v_lim);//
    //const value = v_lim === 0 || v === 0 ? (0.0001) : v*Math.sign(v_lim);
    const color_value = v_lim === 0 || v === 0 ? (0.0001) : (v / v_lim*sign);
    vu.setZ(value * vars.bar_scale);
    vu.setY((1 - camera_scale) * vars.bar_scale_width);
    mu.compose(vw, qu, vu);
    inst.setMatrixAt(index, mu);

    if (!inst.userData.td.color_default[index].selected) {
        utility_color.fromArray(inst.userData.td.base_color).multiplyScalar(Math.abs(color_value));
        inst.setColorAt(index, utility_color.clone());
        inst.userData.td.color_default[index].color = utility_color.toArray();
    }

    return vu.z;
}

function adaptive_scaling_wudi() {
    // return;
    const wudi = scene.getObjectByName('wudi');
    //console.log('adaptive_scaling_wudi', wudi, wudi.children.length);
    if (wudi && wudi.children.length && vars.selecta.wudi.times.selected.length) {
        const wudi_up = scene.getObjectByName('wudi_up');
        const wudi_down = scene.getObjectByName('wudi_down');

        const test = wudi.children[0].userData.td;
        let data_index;
        let cherf = 0;
        const visible = {set: [], up: [], down: []};

        for (let c = 0; c < test.position.length; c++) {
            data_index = vars.data.wudi_index[c];
            //const r_index = wudi_up.userData.td.index.indexOf(index);
            vw.fromArray(test.mid_position[c]);
            map_container.localToWorld(vw);
            //#//TODO make depend on distance from view also.
            //#//ALERT TO HOW u_me vs. u_max is leveraged here.
            if (camera_frustum.containsPoint(vw)) {
                visible.set.push([c, data_index, cherf]);
                visible.up.push([vars.data.wudi_data.current[data_index][3]]);
                visible.down.push([vars.data.wudi_data.current[data_index][4]]);
                cherf++;
            }else{
                if(!mover.is_rotating && vars.selecta.wudi.points.selected.includes(data_index)) vars.selecta.wudi.point_select(data_index);
                // if (wudi_up.userData.td.color_default[c] && wudi_up.userData.td.color_default[c].selected) {
                //     //deselect point!
                //     //console.log(data_index,c);
                //     if(!mover.is_rotating && vars.selecta.wudi.points.selected.includes(data_index)) vars.selecta.wudi.point_select(data_index);
                // }
            }
        }


        const lim = [Math.max(...visible.up), Math.min(...visible.down)];
        lim.push(lim[0]+Math.abs(lim[1]));
        //console.log("visible.set", visible.set);
        // obs_handler({LMS: vars.selecta.wudi.points.hover});

        for (let v of visible.set) {
            //DEBUG /// if (v[0] === 1085) console.log(visible.up[v[2]][0], visible.down[v[2]][0], lim, v[0]);
            const w_up = apply_adaptive_scale(wudi_up, visible.up[v[2]][0], lim[0], v[0], 1.0, lim[2]);
            const w_down = apply_adaptive_scale(wudi_down, visible.down[v[2]][0], lim[1], v[0], -1.0, lim[2]);

            if(v[1] === vars.selecta.wudi.points.canonical_selection[0]){
                wudi_dub_selecta.rescale(v[0],w_up,w_down);
            } //obs_handler({LIM: v});
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
    user_position.actual.copy(vc);

    run_camera();
    run_ticks();
    refresh_sectors();
    adaptive_scaling_wudi();
    wudi_dub_selecta.set_from_point(pid);
}

function move_to_point(target_pid){
    const dub_select = wudi_dub_selecta.set_from_point(target_pid);
    const needs_zoom = camera_scale < 0.5 ? cam_base_pos.z*0.8 : null;

    mover.set_target(user_position.actual, dub_select[0], needs_zoom);
    if(vars.view.camera_auto_affine){
        mover.set_rotation_target(cube, camera_projected, user_position.actual, dub_select[0], dub_select[1]);
    }
}

function wudi_point_select_state(index, state, set_select = null) {
    return;

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

    vars.selecta.wudi.points.canonical_selection = data_index;

    wudi_dub_selecta.set_from_point(data_index[0]);
    //wudi_sub_selecta.set_from_point(data_index[0]);
    if(!q_nav.hover_state) q_nav.set_geo_region('g-'+pt[6], pt[8]);

    let stats = null;
    // if(vars.debug_tool_state) {
    //     stats = {'times': vars.selecta.wudi.times.selected, 'days': [], 'up': [], 'down': [], 'events': []};
    //
    //     data_index.map(dp => {
    //         for (let d of vars.selecta.wudi.times.selected) {
    //             const data_point = vars.data.wudi_data[d].data[dp];
    //             stats.days.push(vars.data.wudi_data[d].meta.siz);
    //             stats.up.push(data_point[0]);
    //             stats.down.push(Math.abs(data_point[1]));
    //             stats.events.push(data_point[2])
    //         }
    //     });
    //
    //     stats.pid = data_index;
    //     stats.iid = inst_index;
    //     stats.days = r_sum(stats.days, stats.times.length);
    //     stats.up = r_sum(stats.up, data_index.length * stats.times.length);
    //     stats.down = r_sum(stats.down, data_index.length * stats.times.length);
    //     stats.events = r_sum(stats.events, data_index.length * stats.times.length);
    //     stats.locat = vars.data.wudi_points.raw.data[inst_index].slice(6, 8);
    // }else{
    //     stats = {'wudi':`${data_index}-g${pt[6]}`};
    // }


    stats = {'times': vars.selecta.wudi.times.selected, 'days': [], 'up': [], 'down': [], 'events': []};
    //stats = {'times': title.innerHTML, 'days': [], 'up': [], 'down': [], 'events': []};

    data_index.map(dp => {
        for (let d of vars.selecta.wudi.times.selected) {
            const data_point = vars.data.wudi_data[d].data[dp];
            stats.days.push(vars.data.wudi_data[d].meta.siz);
            stats.up.push(data_point[0]);
            stats.down.push(Math.abs(data_point[1]));
            stats.events.push(data_point[2])
        }
    });

    const ref = vars.refs.wudi_points[inst_index];
    const labels = [`(${vars.refs.geonames[ref.geo].GEONAME})`, title.innerHTML];

    for(let u of wudi_type_array){
        //console.log(u);
        const col = utility_color.fromArray(vars.colors[u.item]).getHex();
        const stat = r_sum(stats[u.label], data_index.length * stats.times.length);
        labels.push(`<span style="font-family:heavy_data_bold, sans-serif; color:${vars.colors.hex_css(col)}">${stat} ${u.label}-days</span>`);
    }

    labels.push(`${r_sum(stats.days, stats.times.length)} days`);



    // stats.pid = data_index;
    // stats.iid = inst_index;
    // stats.days = r_sum(stats.days, stats.times.length);
    // stats.up = r_sum(stats.up, data_index.length * stats.times.length);
    // stats.down = r_sum(stats.down, data_index.length * stats.times.length);
    // stats.events = r_sum(stats.events, data_index.length * stats.times.length);
    // stats.locat = vars.data.wudi_points.raw.data[inst_index].slice(6, 8);



    return {head:'Nº'+data_index,text:labels};
}

function interactionAction() {
    ray_caster.setFromCamera(vars.user.mouse.raw, camera);
    const intersects = ray_caster.intersectObjects(scene.children, true);

    function make_clean(ints) {
        let len = ints.length;
        let ids = [];
        let result = [];
        let wudi_polled = false;
        let name = null;
        let instance_id = null;
        for (let i = 0; i < len; i++) {

            const t_obj = ints[i].object.userData.hasOwnProperty('is_part') ? ints[i].object.parent : ints[i].object;

            if (t_obj.name.length && t_obj.visible) {
                name = t_obj.id;
                if (ints[i].hasOwnProperty('instanceId')) instance_id = ints[i].instanceId;
                if (ids.indexOf(name) === -1 && ids.indexOf(instance_id) === -1) {
                    const index = instance_id === null ? t_obj.userData.index : instance_id;
                    const is_wudi = t_obj.name.indexOf('wudi') !== -1;
                    if(( is_wudi && !wudi_polled ) || !is_wudi) {
                        let chk_name = t_obj.name.indexOf('mpa_s') !== -1 ? 'mpa_s' : t_obj.name;
                        if (chk_name === 'wudi_up' || chk_name === 'wudi_down') chk_name = 'wudi_points';
                        result.push({name: chk_name + '-' + index, part: chk_name, index: index, ref_object: t_obj});
                        if (is_wudi) wudi_polled = true;
                    }
                    ids.push(instance_id ? instance_id : name);
                }
                instance_id = null;
            }
        }
        //result.sort((a, b) => a.index > b.index ? 1 : -1);
        return result;
    }

    let has_change = false;
    const has_intersections = make_clean(intersects);
    const fired_info = vars.selecta.hover_intersections.map(f => f.name);
    if(fired_info.join('').indexOf('wudi') === -1) vars.selecta.wudi.points.hover = [];

    const has_info = has_intersections.map(ck => {
        //console.log(ck);
        const hk = fired_info.indexOf(ck.name);
        if(hk === -1) {
            vars.info.target_lock = false;
            const fe = element_info_filter.hasOwnProperty(ck.part) ? element_info_filter[ck.part](ck.index) : null;
            if(fe) {
                if (ck.ref_object.userData.hasOwnProperty('mpa_s_outlines')) {
                    const ref = vars.refs[ck.part][ck.index];
                    const m_outlines = new THREE.Group();
                    ck.ref_object.userData.mpa_s_outlines.map(o => {
                        const lmat = new THREE.LineBasicMaterial({color: utility_color.fromArray(vars.colors.mpa_s_designated).clone()});
                        const geometry = new THREE.BufferGeometry();
                        geometry.setAttribute('position', new THREE.BufferAttribute(Float32Array.from(o), 3));
                        const p_pline = new THREE.Line(geometry, lmat);
                        p_pline.userData.color = 'mpa_s_designated';
                        m_outlines.add(p_pline);
                    });
                    m_outlines.name = ck.name;
                    m_outlines.area = ck.ref_object.userData.area;
                    m_outlines.userData.position = new THREE.Vector3(1.0*ref.CENTROID[0],1.0*ref.CENTROID[1],0.0);
                    m_selection_outlines.add(m_outlines);
                }

                if (ck.ref_object.name === 'places_data') {
                    const ref = vars.refs[ck.part][ck.index];
                    console.log(ref);
                    const p_outlines = new THREE.Group();
                    const geometry = new THREE.BufferGeometry();
                    geometry.setAttribute('position', ck.ref_object.geometry.attributes.position);
                    const lmat = new THREE.LineBasicMaterial({color: utility_color.fromArray(vars.colors.places).clone()});
                    const p_pline = new THREE.Line(geometry, lmat);
                    ck.ref_object.getMatrixAt(ck.index, mu);
                    p_pline.applyMatrix4(mu);
                    p_pline.area = ck.area;
                    p_pline.userData.color = 'places';
                    p_outlines.add(p_pline);
                    p_outlines.userData.position = new THREE.Vector3(ref.lon, ref.lat, 0.0);
                    p_outlines.name = ck.name;
                    m_selection_outlines.add(p_outlines);
                }
                has_change = true;
                vars.selecta.hover_intersections.push(fe);
            }
        }

        return ck.name;
    });

    vars.selecta.hover_intersections.map((mp, i) => {
        if(!has_info.includes(mp.name)){
            vars.selecta.hover_intersections.splice(i, 1);
            const oults = m_selection_outlines.getObjectByName(mp.name);
            m_selection_outlines.remove(oults);
            has_change = true;
        }
    });

    if(has_change){
        vars.selecta.hover_intersections.sort((a, b) => a.area > b.area ? 1 : -1);
        m_selection_outlines.children.sort((a, b) => a.area > b.area ? 1 : -1).map((m_c, i) =>{
            const k_offset = 1-(i/m_selection_outlines.children.length);
            if(i === 0 && vars.selecta.hover_intersections[0].name !== m_c.name) ref_marker_2.visible = false;
            m_c.children.map(m_c_c => {
                //
                if(i === 0 && vars.selecta.hover_intersections[0].name === m_c.name){
                    //const t_ref = scene.getObjectByName('ref_mark_2');
                    ref_marker_2.material.color = utility_color.fromArray(vars.colors[m_c_c.userData.color]).clone();
                    vu.copy(m_c.userData.position);
                    map_container.localToWorld(vu);
                    ref_marker_2.position.copy(vu);
                    ref_marker_2.visible = true;

                }
                m_c_c.material.color = utility_color.fromArray(vars.colors[m_c_c.userData.color]).multiplyScalar(k_offset).clone();
            });
        });
    }

    vars.selecta.intersect = has_intersections.length > 0;

    if (vars.selecta.intersect && !vars.info.target_lock) {

        vars.info.set_state(true);
        vars.info.set_text(vars.selecta.hover_intersections);
        vars.info.set_position(vars.user.mouse.screen.x, vars.user.mouse.screen.y, 'mouse');
        //vars.selecta.focus_obj = 'intersection';
    }

    // if (vars.selecta.moved) {
    //     vars.selecta.eco_region.hover = null;
    //     vars.selecta.moved = false;
    // }

    if (!vars.selecta.intersect) {
        // if (vars.selecta.wudi.points.hover.length) wudi_point_select_state(vars.selecta.wudi.points.hover[0], false);
        vars.selecta.wudi.points.hover = [];
        vars.selecta.hover_intersections = [];
        m_selection_outlines.children.map(c_h =>{
            m_selection_outlines.remove(c_h);
        });


        ///vars.info.target_lock = false;
        // const eco_regions = scene.getObjectByName('eco_regions'); ///AREAS
        // if (eco_regions && eco_regions.children.length) {
        //     const eco = eco_regions.children
        //         .filter(e => e.geometry.boundingBox.containsPoint(mouse_pos_map))
        //         .filter(e => point_in_poly(e, mouse_pos_map))
        //     const hover = vars.selecta.eco_region.hover;
        //     if (eco.length) {
        //         const poly = eco[0];
        //         if (poly.id !== hover) {
        //             vars.selecta.focus_obj = 'area';
        //             vars.info.set_state(true);
        //             poly.geometry.boundingBox.getCenter(vw);
        //             map_container.localToWorld(vw);
        //             projected(vw);
        //             vars.info.set_position(vw.x, vw.y);
        //             const data = poly.userData.data;
        //             vars.info.set_text([{head: data[2], text: `id:${data[0]}`}]);
        //             poly.userData.selected(true);
        //             if (hover) scene.getObjectById(hover, true).userData.selected(false);
        //         }
        //         vars.selecta.eco_region.hover = poly.id;
        //
        //     } else {
        //         if (hover) scene.getObjectById(hover, true).userData.selected(false);
        //         vars.info.set_state(false);
        //         vars.selecta.eco_region.hover = null;
        //     }
        // }

        // if (vars.selecta.focus_obj === 'intersection') {
        //     vars.info.set_state(false);
        // }
        if(vars.loaded) wudi_dub_selecta.dub_box.visible = false;
        if(vars.loaded) ref_marker_2.visible = false;

        vars.info.set_state(vars.info.target_lock);
    }


    return vars.selecta.hover_intersections.length ? vars.selecta.hover_intersections[0].name : null;
}

function refresh_sectors(){

    vc.subVectors(camera.position, camera.up);
    root_plane.projectPoint(vc, vu);
    vk.subVectors(user_position.actual, vu).multiplyScalar(0.5 / vars.degree_scale);
    camera_projected.copy(vk);

    if(map_sectors_group.children.length) map_sectors_group.children.forEach(s => {
        vw.copy(s.userData.center);//userData.owner.objects.plane.userData.center);

        map_sectors_group.localToWorld(vw);
        //vu.sub(camera.up);
        vc.copy(user_position.actual).sub(camera_projected);

        if(vars.helpers_active) pos_mark_1.position.copy(vc);

        const figuration = Math.floor(Math.pow(camera_scale, vars.levels)*(vars.levels+1));
        const L = vw.distanceTo(vc);
        if (L < vars.levels * vars.degree_scale) {
            let LV = figuration - Math.floor((L/(vars.levels * vars.degree_scale))*vars.levels);
            //let LV = Math.floor(Math.pow(camera_scale, vars.levels)*(vars.levels)); camera_scale*
            //let LV = Math.round((vars.levels - Math.round((L) / vars.degree_scale)) * (Math.round((camera_scale) * vars.levels) / vars.levels));
            if (LV > 4) LV = 4;
            if (LV < 0) LV = 0;
            s.userData.owner.set_level(LV);
        }
    });

    //opacity adj for others?
    // function setOpacity(obj, opacity) {
    //   obj.traverse(child => {
    //     if (child instanceof THREE.Mesh) {
    //       child.material.opacity = opacity;
    //     }
    //   });
    // }
    //
    // const places = scene.getObjectByName('places_data');
    // const protected_reg = scene.getObjectByName('mpa_s');
    return true;
}

function control_appearance_sectors(att, state){
    if(map_sectors_group.children.length) map_sectors_group.children.forEach(s => {
        s.userData.owner.toggle_attribute(att, state);
    });
}

function run_optics(){
    camera_scale = 1 - (camera_distance / vars.max_zoom);
    const zg = Math.floor(Math.log(camera_distance)) + 1;
    grid_resolution = z_mants[zg];
}


function event_click_handler(){

    if (vars.selecta.wudi.points.hover.length) {
        vars.selecta.wudi.point_select(vars.selecta.wudi.points.hover[0]);
        vars.selecta.wudi.points.hover = [];
        vars.info.target_lock = false;
        vars.info.set_state(false);
    }else{
        ///
        // vars.info.set_position(ref_marker_2.position.x, ref_marker_2.position.y, 'area');
        // vars.info.target_lock = true;
        // vars.info.lock_position = ref_marker_2.position;
        // mover.set_target(user_position.actual, mouse_plane_pos);
        if(ref_marker_2.visible){
            vars.info.target_lock = true;
            vars.info.lock_position = vars.user.mouse.screen;
            const kel = vars.selecta.hover_intersections[0];
            const ktx = element_info_filter_secondary[kel.type](kel.index);
            vars.info.set_state(true);
            vars.info.set_text([ktx]);
            vars.info.set_position(vars.user.mouse.screen.x, vars.user.mouse.screen.y, 'mouse');
            ref_marker_2.visible = false;
        }else{
            vars.info.target_lock = false;
            vars.info.set_state(false);
            vars.selecta.hover_intersections = [];
            mover.set_target(user_position.actual, mouse_plane_pos);
        }

        vars.selecta.wudi.points.hover = [];
    }
    //vars.user.mouse.clicked = true;
    // user_position.actual.copy(mouse_plane_pos);

}

function event_handler(type, evt_object){
    run_camera();


    // if(type !== 'init' && type !== 'touch') obs_handler({
    //     plot: type,
    //     act:Object.entries(evt_object.actual),
    //     del:Object.entries(evt_object.delta),
    //     whl:evt_object.wheel_delta !== null ? Object.entries(evt_object.wheel_delta) : null,
    //     btn:evt_object.button,
    //     map_s:map_sectors_group.children.length});


    let action, roto_x, roto_y, pos_x, pos_y, delta_x, delta_y, scale_z;
    // delta_x = null;
    // delta_y = null;

    if (type === 'init') {
        pos_x = vars.view.width / 2;
        pos_y = vars.view.height / 2;
    }

    if(type === 'touch'){
        //obs_handler({touch: evt_object.action});
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

        }else if(evt_object.touches.length === 1){
            pos_x = primary.x;
            pos_y = primary.y;
            delta_x = primary.x_d;
            delta_y = primary.y_d;
            touches_mid.x = null;
            touches_mid.y = null;
        }else{
            // pos_x = vars.user.mouse.screen.x;//0;//evt_object.x;
            // pos_y = vars.user.mouse.screen.y;//0;//evt_object.y;
            pos_x = evt_object.x;
            pos_y = evt_object.y;
        }

        // obs_handler({
        //     touch: evt_object.action,
        //     roto_x: roto_x,
        //     roto_y: roto_y,
        //     pos_x: pos_x,
        //     pos_y: pos_y,
        //     scale_z: scale_z,
        //     leg: evt_object.lag
        // });
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
                if(action === 'drag'){
                    delta_x = evt_object.delta.x;// === 0 ? null : evt_object.delta.x;
                    delta_y = evt_object.delta.y;// === 0 ? null : evt_object.delta.y;
                }
            }
        }
        if (action === 'scroll'){
            scale_z = 1 + (evt_object.wheel_delta.y / 400.0);
        }
        if (action === 'cancel'){
            //obs_handler({cancel:evt_object.evt.target.parentNode.id});
            grid_lines.visible = false;
            //return false;
        }else{
            //obs_handler({capture:evt_object.evt.target.parentNode.id});
            grid_lines.visible = true;
        }
    }

    vars.user.mouse.state = action;
    vars.user.mouse.raw.x = (pos_x / vars.view.width) * 2 - 1;
    vars.user.mouse.raw.y = -(pos_y / vars.view.height) * 2 + 1;
    vars.user.mouse.screen = {x: pos_x, y: pos_y};
    ///document.body.style.cursor = 'pointer';

    m_ray_origin.set(vars.user.mouse.raw.x, vars.user.mouse.raw.y, 0.0).unproject(camera);
    m_ray_pos.set(vars.user.mouse.raw.x, vars.user.mouse.raw.y, 1.0).unproject(camera);
    m_ray_dir.copy(m_ray_pos.sub(m_ray_origin));

    if (type === 'init') {
        console.log('event_handler init fired by init()');
        interactionAction();
    }else{
        if (action === 'down' || action === 'secondary-down' || action === 'secondary-up') {
            lastMouseDown.copy(rayIntersectionWithXZPlane(m_ray_origin, m_ray_dir, 0.0));
            mouseDownCameraPosition.copy(user_position.actual);
        }
        if (roto_x && roto_y) {
            cube.rotateOnWorldAxis(y_up, roto_x);
            cube.rotateX(roto_y);
            cube.updateMatrixWorld();
            // vars.info.set_state(false);
            // vars.selecta.moved = true;
        }
        if (delta_x || delta_y) {
        //if (delta_x !== null && delta_y !== null) {
            //#//TODO what is this? onDrag?
            mover.cancel();
            newMouseDown.copy(rayIntersectionWithXZPlane(m_ray_origin, m_ray_dir, 0.0));
            user_position.actual.copy(mouseDownCameraPosition.sub(newMouseDown.sub(lastMouseDown)));
            vars.info.drag_position(delta_x, delta_y);
            // vars.selecta.moved = true;
        }
        if (scale_z){
            mover.cancel();
            if (cam_base_pos.z < vars.min_zoom) {
                cam_base_pos.z = vars.min_zoom;
            } else if (cam_base_pos.z > vars.max_zoom) {
                cam_base_pos.z = vars.max_zoom;
            } else {
                cam_base_pos.multiplyScalar(scale_z);
                vk.subVectors(mouse_plane_pos, user_position.actual);
                user_position.actual.add(vk.multiplyScalar((1 - scale_z)));
                vars.selecta.moved = true;
            }
        }
    }







    if (action !== 'move' && action !== 'init') {
        // ['mpa_s','places_data'].map(g =>{
        //     const g_grp = scene.getObjectByName(g);
        //     if(g_grp) g_grp.children[0].material.uniforms.level.value = (1.0-(camera_scale*0.8));
        // });
        // const reg_protected = scene.getObjectByName('mpa_s');
        // if(reg_protected) {
        //     reg_protected.children[0].material.uniforms.level.value = ((1.0-camera_scale));// = true;
        //     //reg_protected.children[0].material.needsUpdate = true;
        // }
        const g_grp = scene.getObjectByName('places_data');
        if(g_grp) g_grp.children[0].material.uniforms.level.value = (1.0-(camera_scale*0.8));

        run_camera();
        adaptive_scaling_wudi();
        run_ticks();
        refresh_sectors();
    }


    if (action === 'move' || action === 'touch-hover') {
        //mouse hover and mobile pause-hover.
        //selection phase one.
        interactionAction();
    }


    if (action === 'click') event_click_handler();

    if (action === 'touch-click') {
        const manifest = interactionAction();
        if((manifest === null) || (vars.selecta.touch.select && vars.selecta.touch.clicked === manifest)){
            event_click_handler();
            vars.selecta.touch.select = false;
        }else{
            vars.info.target_lock = false;
            vars.selecta.touch.clicked = interactionAction();
            vars.selecta.touch.select = true;
        }
    }

    ray_caster.setFromCamera(vars.user.mouse.raw, camera);
    ray_caster.ray.intersectPlane(root_plane, vk);
    mouse_plane_pos.set(vk.x, vk.y, vk.z);
    mouse_pos_map.set(mouse_plane_pos.x + vars.map.offset.x, Math.abs((mouse_plane_pos.z - vars.map.offset.y) + vars.view.map_vertical_deg_offset), 0.0);

    run_optics();

    if(vars.helpers_active) pos_mark_4.position.copy(mouse_plane_pos);

    grid_lines.position.copy(mouse_plane_pos);


    if (active_keys.includes('KeyI')) {
        obs_handler({
            cZ: camera_distance.toFixed(2),
            // UD: mouse_plane_pos.toArray().map(e => e.toFixed(2)).join(', '),
            // SW: visible_dimensions.w.toFixed(2),
            // SH: visible_dimensions.h.toFixed(2),
            // DY: cam_dot_y.toFixed(2),
            // DX: cam_dot_x.toFixed(2),
            // DZ: cam_dot_z.toFixed(2),
            // UR: user_position.round.toArray().map(e => e.toFixed(2)).join(', '),
            // UM: mouse_pos_map.toArray().map(e => e.toFixed(2)).join(', '),
            // GR: grid_resolution,
            // AS: (camera_distance / visible_dimensions.w).toFixed(2),
            AF: camera_scale.toFixed(2),
            // AL: prefig.toFixed(2),
            AC: cam_base_pos.z.toFixed(2),
        });
    }

    q_nav.hover_state = false;

    if(type !== 'init'){
        //evt_object.evt.stopPropagation();
        //evt_object.evt.preventDefault();
    }

}

function control_recenter_map(){
    cam_base_pos.set(0, 0, vars.max_zoom);
    cam_pos.set(0, 0, 0);
    user_position.actual.set(0, 0, 0);
    user_position.round.set(0, 0, 0);
    cube.userData.originalMatrix.decompose(cube.position, cube.quaternion, cube.scale);
    cube.matrix.copy(cube.userData.originalMatrix);

    run_camera();
    run_optics();
    adaptive_scaling_wudi();
    run_ticks();
    refresh_sectors();
}

function control_camera_behavior(){
    vars.view.camera_auto_affine = !vars.view.camera_auto_affine;
    this.classList.toggle('control-toggle');
}

function control_navigation_state(){
    vars.view.navigation_active = !vars.view.navigation_active;
    this.classList.toggle('control-toggle');

    // display_array[+vars.view.navigation_active];
    // q_nav_bar.classList.toggle('hidden');
    q_nav_bar.style.display = 'block';
    //alert(display_array[+vars.view.navigation_active]);
    window_redraw();
}

function control_instructions_state(){
    vars.view.instructions_active = !vars.view.instructions_active;
    this.classList.toggle('control-toggle');
    const instructions_slide = document.getElementById('intro-instructions');
    instructions_slide.style.display = display_array[+vars.view.instructions_active];//'block';
}

function control_mpa_s_state(){
    vars.mpa_s_visible = !vars.mpa_s_visible;
    this.classList.toggle('control-toggle');
    control_appearance_sectors('mpa_s', vars.mpa_s_visible );
}

function keyAction(raw) {
    active_keys = raw;

    if (raw.includes('Space')) {
        control_recenter_map();
    }

    if (raw.includes('Tab')) {
        if(!vars.previous_keys.includes('Tab')) {
            toggle_debug_tools_state();
        }
    }

    vars.previous_keys = [...active_keys];
}

function toggle_debug_tools_state(override=null){
    vars.debug_tool_state = override !== null ? override : !vars.debug_tool_state;
    stats.dom.style.display = display_array[+vars.debug_tool_state];
    obs.style.display = display_array[+vars.debug_tool_state];
}

function run_camera() {
    cam_pos.copy(cam_base_pos.clone().applyQuaternion(cube.quaternion));
    //cam_pos.lerp(cam_base_pos.clone().applyQuaternion(cube.quaternion), 0.1);
    camera.up.copy(y_up.clone().applyQuaternion(cube.quaternion));
    //camera.up.lerp(y_up.clone().applyQuaternion(cube.quaternion), 0.1);
    camera.position.addVectors(cam_pos, user_position.actual);
    camera.lookAt(user_position.actual);
    camera.updateMatrix();
    camera.updateMatrixWorld();
    camera_frustum.setFromProjectionMatrix(camera_frustum_m.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));

    camera.getWorldDirection(vu);
    cam_right.crossVectors(vu, camera.up);

    cam_dot_y = camera.up.dot(root_plane.normal);
    cam_dot_x = cam_right.dot(x_right);
    cam_dot_z = z_in.dot(vu);

    vw.subVectors(camera.position, user_position.actual);
    camera_distance = vw.length();

    for (let plane of axis_planes) {
        vk.copy(plane.position);
        vk.unproject(camera);

        plane.plane.set(vw.negate(), 0);
        vu.subVectors(vk, camera.position).normalize();
        ray_caster.set(camera.position, vu);

        ray_caster.ray.intersectPlane(root_plane, vw);
        vc.subVectors(user_position.actual, vw);

        if (plane.name === 'x') {
            plane.plane.set(vc, 0);
            //plane.up.crossVectors(vw, vc);
        } else {
            //crucial bit of kung-fu
            plane.plane.set(camera_frustum.planes[1].normal, 0);
        }
        plane.plane.translate(vw);
    }

    vars.user.group.position.copy(user_position.actual);
    user_position.round.copy(user_position.actual).round();
    if(vars.helpers_active) pos_mark_2.position.copy(user_position.round);

    // vc.subVectors(camera.position, camera.up);
    // root_plane.projectPoint(vc, vu);
    // vk.subVectors(user_position.actual, vu).multiplyScalar(0.5 / vars.degree_scale);
    // camera_projected.copy(vk);
    // camera_map_local.copy(camera.position);
    // // camera_map_local.setY(camera.position.z);
    // // camera_map_local.setZ(camera.position.y);
    // map_container.worldToLocal(camera_map_local);
}

function run_ticks_axes(axis, tick_index, swap = null) {
    const basis = {x: 'x', z: 'z'};
    const axes = [axis_dir_x, axis_dir_y];

    if (swap) {
        basis.x = 'z';
        basis.z = 'x';
    }

    const tick_n = Math.round((user_position.round[basis[axis]]) / grid_resolution) * grid_resolution + ((tick_index - ((axis_markers_count - 1) / 2)) * grid_resolution);

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
    return tick_n;
}

function run_ticks() {
    vars.selecta.wudi.points.dom_handles.map(dh => {
        dh.draw();
    })

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

    //if(vars.helpers_active) arrow_helper_4.setDirection(cam_right);

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
                ticks.offset = ticks.card === 'E' ? vars.map.offset.x : -vars.map.offset.y+vars.view.map_vertical_deg_offset;

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

function animate(f) {
    vars.animationFrame = window.requestAnimationFrame(animate);
    render(f);
}

function render(a) {
    if(vars.suspend) return;
    //#//yes yer doing it.
    vars.info.update_position();
    mover.ctr.set(a);
    stats.update();
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
                    //instance_dummy.scale.z = instance.userData.td.sample_raw[i];
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
            //console.log(instance.id, instance.name);
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

        //const v = new Float32Array(vars.data[obj.name].raw.data.length);

        if (obj.name === 'places_data') {
            //const v = new Float32Array(18);
            ///custom json-ser from db based
            console.log(obj);
            datum.len = vars.data[obj.name].raw.data.length;// -1;
            const pop = util.find_scale(obj.raw.data, 5);
            //console.log(pop);

            //vars.data[obj.name].references = [];
            vars.data[obj.name].lookup_table = {};

            for (let i = 0; i < datum.len; i++) {
                datum.sample_raw.push(1.0);
            }

            for (let i = 0; i < datum.len; i++) {
                datum.color.push(vars.colors.places);
                datum.position.push([vars.data[obj.name].raw.data[i][0], vars.data[obj.name].raw.data[i][1], 0.0]);
                const kvs = vars.data[obj.name].raw.data[i][5];
                let dnorm = util.norm_val(kvs, pop.min, pop.avg);

                if (dnorm > 5.0) dnorm = 5;
                if (dnorm < 1.0) dnorm = 1.0;
                datum.sample_raw[i] = dnorm;

                vars.data[obj.name].lookup_table[vars.data[obj.name].raw.data[i][16]] = i;
            }
            console.log(vars.data[obj.name].references);
            //datum.len -= 1;
        }

        if (obj.name === 'mpa_s') {
            console.log(obj);
            ///custom text-based
            datum.len = vars.data[obj.name].raw.data.length - 1;
            const cent = vars.data[obj.name].raw.keys.indexOf('CENTROID');

            for (let i = 1; i < vars.data[obj.name].raw.data.length; i++) {
                datum.color.push(vars.colors.mpa_s_designated);
                datum.position.push([vars.data[obj.name].raw.data[i][cent][0], vars.data[obj.name].raw.data[i][cent][1], 0.0]);
                datum.sample_raw.push(1.0);
            }

            const area = util.find_scale(obj.raw.data, 5);

            obj.raw.data.map((e, i) => {
                if (i > 0 && e[5] !== null) {
                    let norm =  util.norm_val(e[5], area.min, area.avg);
                    if (norm > 4.0) norm = 4.0;
                    if (norm < 1.0) norm = 1.0;
                    //console.warn(parseFloat(norm.toFixed(4)));
                    datum.sample_raw[i] = norm;
                }
            })
        }

        const geometry = make_hexagonal_shape(vars.point_scale);
        geometry.deleteAttribute('uv');
        geometry.deleteAttribute('normal');
        // const material = new THREE.MeshBasicMaterial({
        //     color: 0xFFFFFF,
        //     side: THREE.FrontSide,
        //     transparent: true,
        //     opacity: 0.5,
        //     blending: THREE.AdditiveBlending,
        //     depthWrite: false,
        // });
        const material = new THREE.ShaderMaterial({
            uniforms: {
              level: {
                value: 1.0,
              },
              color: {
                value: new THREE.Color().fromArray(datum.color[0]),
              }
            },
            vertexShader: document.getElementById('legend-vertex-Shader').textContent,
            fragmentShader: document.getElementById('legend-fragment-Shader').textContent,
            side: THREE.FrontSide,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthTest: false,
            depthWrite: false,
        });

        material.needsUpdate = true;
        material.uniformsNeedUpdate = true;

        // const array = Array.from(geometry.attributes.position);//.slice(0,18);
        // //Float32Array
        // const new_arr = new Uint16Array(array);
        //
        // //console.warn(obj.name, datum.sample_raw.length, datum.len);

        const instance = new THREE.InstancedMesh(geometry, material, datum.len);
        // const kbe = new THREE.InstancedBufferAttribute(new Float32Array(datum.sample_raw), 1);
        // kbe.name = obj.name+'-s_sample';
        // instance.geometry.setAttribute('s_sample', kbe);

        instance.geometry.computeBoundingSphere();
        instance.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        instance.name = obj.name;
        instance.userData.type = 'scaled_point';

        //if (obj.name === 'mpa_s') instance.userData.type = 'scaled_point';
        instance.userData.td = datum;

        if (obj.name === 'mpa_s') instance.visible = false;

        group.add(instance);

    } else {
        //for text-based datasets with polygonal geometries
        //console.log(obj);
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
                    const material = new THREE.LineBasicMaterial({
                        color: utility_color.fromArray(vars.colors[obj.name]).clone(),
                        opacity:vars.colors[obj.name][3],
                        transparent: true
                    });
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

    return true;
}

//#// changed points here
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
        mid_position: data.map((v) => [v[3], v[2], 0.0]),
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
    // console.log(vars.data.geo_regions);
    // Object.entries(geo_regions).map((k,v,i) => console.log(k,v,i));
    // //console.log(point_data_td.index);

    // const geometry = make_hexagonal_shape(vars.wudi_point_scale); //wudi_point_scale
    // geometry.deleteAttribute('uv');
    // geometry.deleteAttribute('normal');
    // const material = new THREE.MeshBasicMaterial({
    //     color: 0xFFFFFF,
    //     side: THREE.FrontSide,
    //     transparent: true,
    //     opacity: 1.0,
    //     blending: THREE.AdditiveBlending,
    //     depthWrite: false,
    // });
    //
    // const instance = new THREE.InstancedMesh(geometry, material, point_data_td.len);
    // instance.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    // instance.name = 'wudi_points';
    // instance.userData.type = 'points';
    // instance.userData.td = point_data_td;
    // instance.visible = point_data_td.visible;
    // group.add(instance);

    const bar_instances = [
        {name: 'wudi_down', len: data.length, base_color: vars.colors.downwelling, visible: true, sign: -1},
        {name: 'wudi_up', len: data.length, base_color: vars.colors.upwelling, visible: true, sign: 1},
        //{name: 'wudi_meta', len: data.length, base_color: [0, 0, 0], visible: false, sign: 1}
    ];

    const bar_attributes = ['color', 'position', 'mid_position', 'rotation', 'scale', 'value', 'raw', 'index', 'color_default'];

    for (let bar of bar_instances) {
        for (let a of bar_attributes) bar[a] = [];

        for (let i = 0; i < data.length; i++) {
            const A = new THREE.Vector3(data[i][1], data[i][0], 0.0);
            const B = new THREE.Vector3(data[i][5], data[i][4], 0.0);
            const M = new THREE.Vector3(data[i][3], data[i][2], 0.0);
            const angle = Math.atan2(B.y - A.y, B.x - A.x);
            bar.position.push([A.x, A.y, A.z]);
            bar.mid_position.push([M.x, M.y, M.z]);
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

    console.log(bar_geometry);

    ///bar_geometry.setDrawRange(0,18);

    // bar_geometry.groups = bar_geometry.groups.slice(0,3);
    // console.log(bar_geometry);
    // const fart = [
    //     0, 2, 1,
    //     2, 3, 1,
    //     8, 10, 9,
    //     10, 11, 9,
    //     12, 14, 13,
    //     14, 15, 13,
    //     16, 18, 17,
    //     18, 19, 17,
    //     20, 22, 21,
    //     22, 23, 21
    // ]
    //
    // const new_arr = new Uint16Array(fart);
    // bar_geometry.index.array = new_arr;
    // bar_geometry.index.count = 30;

    // const array = Array.from(bar_geometry.index.array).slice(0,18);
    //
    // const new_arr = new Uint16Array(array);
    // console.log(array);
    // //
    // const kfs = bar_geometry.index.array.splice(0,6);

    // bar_geometry.index.array = new_arr;//setAttribute('index',kfs);
    // bar_geometry.index.count = 18;

    const bar_material_blank = new THREE.MeshBasicMaterial({
        color: 0xFFFFFF,
        side: THREE.FrontSide,
        transparent: true,
        opacity: 0.0,
        blending: THREE.AdditiveBlending, //AdditiveBlending, //THREE.NormalBlending, //
        depthWrite: false,
        depthTest: false
    });

    const bar_material = new THREE.MeshBasicMaterial({
        color: 0xFFFFFF,
        side: THREE.FrontSide,
        //wireframe: true,
        transparent: true,
        opacity: 1.0,
        blending: THREE.AdditiveBlending, //AdditiveBlending, //THREE.NormalBlending, //
        depthWrite: false,
        depthTest: false,
        //depthMode: THREE.GreaterEqualDepth ///EqualDepth //THREE.GreaterDepth
    });
    //[bar_material, bar_material, bar_material, bar_material, bar_material, bar_material]
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
    //console.log(group);
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

function download(content, mimeType, filename){
    const a = document.createElement('a') // Create "a" element
    const blob = new Blob([content], {type: mimeType}) // Create a blob (file-like object)
    const url = URL.createObjectURL(blob) // Create an object URL from blob
    a.setAttribute('href', url) // Set "a" element link
    a.setAttribute('download', filename) // Set download filename
    a.setAttribute('size', blob.size.toString()) // Set download filename
    a.classList.add('download-link');
    //a.click() // Start downloading
    a.innerHTML = `download ${filename}`;
    return a;
}

function generate_output(block){

    const wudi_textual_output = [];
    const wudi_geodata_output = [];
    const wudi_temporal_output = [];
    const point_data = vars.data.wudi_points.raw;

    const output_text = document.getElementById('output-text');
    output_text.innerHTML = '';

    const geodata_header = point_data.keys.slice(0,6);
    geodata_header.unshift('point_id');
    wudi_geodata_output.push(geodata_header);

    const temporal_header_equiv = {
		all: ['time', 'point_id', 'up_days', 'down_days'],
		year: ['time', 'point_id', 'up_days', 'down_days'],
		month: ['time', 'point_id', 'wudi_value', 'qualifies']
	}

    let wudi_data_header = null;
    let point_traces = [];

    for (let point of block) {

        if(!point_traces.includes(point.id) && point.id !== 'AVG'){
            const values = point_data.data[point.id].slice(0,6);
            values.unshift(point.id);
            point_traces.push(point.id);
            wudi_geodata_output.push(values);
        }

        if(!wudi_data_header){
            wudi_data_header = temporal_header_equiv[point.style];
            wudi_temporal_output.push(wudi_data_header);
        }

        for(let pt of point.ref_data.data){
            let pt_lex = null;
            let qual = null;

            if(point.style === 'month'){
                if(pt[1] > vars.wudi_UPWthr) qual = 'up';
                if(pt[1] < vars.wudi_DNWthr) qual = 'down';
                pt_lex = [pt[0], point.id, pt[1], qual];
            }else{
                pt_lex = [pt[0], point.id, pt[1], Math.abs(pt[2])];
            }
            wudi_temporal_output.push(pt_lex);
        }
    }

    const date = new Date(Date.now()).toISOString().slice(0, 19).replace('T', ' ');

    wudi_textual_output.push('Wind-based Upwelling & Downwelling Index (WUDI) data base for Mediterranean shorelines (Bensoussan N., Pinazo C., Rossi V. (2022)).');
    wudi_textual_output.push(`Accessed on ${date}`);
    wudi_textual_output.push(`Data points selected: ${point_traces.map(p =>'Nº'+p)}`);
    wudi_textual_output.push(`Temporal series selected: ${title.innerHTML}`);

    function make_html_table(table_data){
        const shlex = [];
        for(let row of table_data){
            const parts = row.map(r => `<div class="output-cell">${r}</div>`);
            shlex.push(`<div class="output-row">${parts.join('')}</div>`);
        }
        return `<div class="output-table">${shlex.join('\n')}</div>`
    }

    const wudi_textual = wudi_textual_output.join('\n');
    const wudi_geodata = wudi_geodata_output.join('\n');
    const wudi_timeseries = wudi_temporal_output.join('\n');


    //download(smack,'data:text/plain;charset=utf-8,' + encodeURIComponent(smack), 'test.csv');
    const download_textual_button = download(wudi_textual, 'data:text/plain;charset=utf-8', 'wudi-points-readme.txt');
    const download_geodata_button = download(wudi_geodata, 'data:text/plain;charset=utf-8', 'wudi-points-geodata.csv');
    const download_temporal_button = download(wudi_timeseries, 'data:text/plain;charset=utf-8', 'wudi-points-timeseries.csv');

    const dl_buttons = [download_textual_button,download_geodata_button,download_temporal_button];

    const output_sections = [
        ['selected wudi points information', wudi_textual, 'raw-text', download_textual_button],
        ['selected wudi points geodata', make_html_table(wudi_geodata_output), '', download_geodata_button],
        ['selected wudi points information', make_html_table(wudi_temporal_output), '', download_temporal_button],
    ];



    function get_download(){
        [...document.querySelectorAll('.download-link')].map(a =>{
            a.click();
        });
    }

    function get_download_button(){
        const dl = document.createElement('div');
        dl.classList.add('output-section');
        dl.classList.add('output-download-link');

        let bytes = 0;
        dl_buttons.map(a =>{
            bytes += parseInt(a.getAttribute('size'));
        })

        const al = document.createElement('a');
        al.setAttribute('href','#');
        al.innerHTML = 'download selected point data ('+(bytes/1000).toFixed(2)+'k)';
        al.addEventListener('mouseup', get_download);

        dl.appendChild(al);
        return dl
    }

    output_text.appendChild(get_download_button());
    output_sections.map(outs =>{
        const section = document.createElement('div');
        section.classList.add('output-section');
        section.appendChild(outs[3]);
        section.innerHTML += `<div class="output-section-title">${outs[0]}</div>`;
        section.innerHTML += `<div class="output-section-content ${outs[2]}">${outs[1]}</div>`;
        output_text.appendChild(section);
    })


}

async function wudi_get_point_detail(points_selected) {
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

//#//GRAPH:
async function wudi_graph_chart_daily() {
    const style_current = graph_bar.style.display;

    /*
    * ALL : 2 values (43)
    * YEAR: 2 Values (12)
    * Mont: 1 Value  (31)
    * */

    //#//NEW GET DL HERE NEEDS TO BE TWO VALUES

    if(vars.selecta.wudi.points.selected.length) {
        const diagonal = vars.selecta.wudi.times.selected.map(t => {
            return Math.max(...vars.selecta.wudi.points.selected.map(p => vars.wudi_point_cache[`${p}-${t}`].meta));
        });

        console.log('selected points',vars.selecta.wudi.points.selected);
        //console.log('selected points cache',vars.wudi_point_cache);

        // up down flat
        const cache_for_output = [];
        const max_len = Math.max(...diagonal);
        const aggregate = [];
        let mean = [0, 0];
        for(let g=0; g<max_len; g++) aggregate.push([0,0]);
        let res_count = 0;
        let ref_style = null;

        const time_keys = [];

        for (let t of vars.selecta.wudi.times.selected) {
            for (let p of vars.selecta.wudi.points.selected) {
                const time_slot = `${p}-${t}`;
                const reference = vars.wudi_point_cache[time_slot];
                //console.log(t,p,reference);

                ref_style = reference.style;
                reference.data.map((d, i) => {
                    if(reference.style === 'month'){
                        aggregate[i][0] += d[1];
                        mean[0] += d[1];
                    }else{
                        aggregate[i][0] += d[1];
                        mean[0] += d[1];
                        aggregate[i][1] += d[2];
                        mean[1] += d[2];
                    }

                    time_keys.push(d[0]);
                });
                res_count++;
                cache_for_output.push({id:p, tid:time_slot, ref_data:reference, style:ref_style});
            }
        }



        mean[0] /= res_count;
        mean[1] /= res_count;

        const aggregate_avg = [0,0];
        aggregate_avg[0] = aggregate.map(a => Math.round((a[0] / res_count) * 10000) / 10000);
        aggregate_avg[1] = aggregate.map(a => Math.round((a[1] / res_count) * 10000) / 10000);

        if(vars.selecta.wudi.points.selected.length > 1){
            const rdat = [];
            for(let ac = 0; ac < aggregate.length; ac++){
                rdat.push([time_keys[ac], aggregate_avg[0][ac], aggregate_avg[1][ac]]);
            }

            cache_for_output.push({id:'AVG', tid:0, ref_data:{data:rdat, id:'all'}, style:ref_style});
        }
        generate_output(cache_for_output);







        const up_col = utility_color.fromArray(vars.colors.upwelling).getHex();
        const dn_col = utility_color.fromArray(vars.colors.downwelling).getHex();

        let y_limits = [];
        if(mean[1] === 0){
            y_limits = [Math.min(...aggregate_avg[0]), Math.max(...aggregate_avg[0])];
        }else{
            y_limits = [Math.min(...aggregate_avg[1]), Math.max(...aggregate_avg[0])];
        }

        const graph_obj = {
            xlim: [0, max_len],
            ylim: y_limits,
            mean: [[mean[0] / max_len], [mean[1] / max_len]],
            data: aggregate_avg,
            up_color: vars.colors.hex_css(up_col,0.5),
            up_color_select: vars.colors.hex_css(up_col),
            down_color: vars.colors.hex_css(dn_col,0.5),
            down_color_select: vars.colors.hex_css(dn_col),
            x_range_start: ref_style === 'all' ? 1978 : 1,
            graph_style: ref_style,
            wudi_th_up: vars.wudi_UPWthr,
            wudi_th_down: vars.wudi_DNWthr,
            main_title: title.innerHTML
        }

        ///console.log(graph_obj, vars.selecta.wudi);

        graph(graph_obj, vars.view.width, vars.view.graph_obj_height, vars.selecta.wudi);

        graph_bar.classList.remove('hidden');
        graph_bar.style.display = 'block';
        graph_bar.style.height = vars.view.graph_obj_height+'px';

    }else{
        graph_bar.style.display = 'none';
    }

    if(style_current !== graph_bar.style.display) window_redraw();
    return true;
}

async function wudi_set_chart_daily(result_obj) {

    // return;
    console.log('result_obj', result_obj);

    result_obj.forEach(obj => {

        const request_length = obj.special.length; ///number of points per time.
        const asset_raw_length = obj.raw.data.length;
        //
        const general_length = asset_raw_length / request_length;/// > general_length ? asset_raw_length/request_length : general_length;
        const subset_arrays = array_chuk(obj.raw.data, general_length);

        //console.log('subset_arrays', subset_arrays);

        subset_arrays.map((v, n) => {
            const time_slot = `${obj.special[n]}-${obj.tim}`;
            vars.wudi_point_cache[time_slot] = {'data': v, 'meta': v.length, 'id':obj.special[n], 'style':vars.graph_styles[obj.tim.length]};
        })
    });

    await wudi_graph_chart_daily().then(r => {
        // return;
        // console.log(r, 'points_selected', vars.selecta.wudi.points.canonical_selection);
        const p_hover = vars.selecta.wudi.points.canonical_selection[0];
        if(vars.selecta.wudi.points.selected.includes(p_hover)) move_to_point(p_hover);
    });
    //
    // wudi_graph_chart_daily();
}

function wudi_set_data(obj_list) {
    if (!vars.data.hasOwnProperty('wudi_data')) vars.data.wudi_data = {points_count: 0, current: []};
    obj_list.forEach(obj => {

        //#//updates and draws the instances
        const data = obj.raw.data;
        vars.data.wudi_data.points_count = data.length;
        const meta = obj.raw.meta;
        const time_slot = obj.tim === '40' ? 'all' : obj.tim.toString();
        vars.selecta.wudi.times.loaded.push(time_slot);
        vars.data.wudi_data[time_slot] = {'data': data, 'meta': meta};

        // console.log('obj', obj);
        // console.log('this', time_slot, vars.data.wudi_data[time_slot]);

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

    //console.log('wudi_set_data_selection', points_count, times_count);
    //CRAZY//
    for (let i = 0; i < points_count; i++) {
        new_normals.push([0.0, 0.0, 0.0, 0.0, 0.0]);
        new_aggregated.push([0.0, 0.0, 0.0, 0.0, 0.0, []]);
    }
    const meta_avg = {siz: 0, u_me: 0, d_me: 0, u_mx: 0, d_mx: 0};
    for (let t = 0; t < times_count; t++) {
        const tn = vars.selecta.wudi.times.selected[t].toString();
        //console.log(tn);
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
    const rel_meta = [meta_avg.u_mx, meta_avg.d_mx, 1, meta_avg.u_me, meta_avg.d_me];
    //const rel_meta = [meta_avg.u_me, meta_avg.d_me, 1, meta_avg.u_mx, meta_avg.d_mx];

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

function window_redraw(first_run=null) {
    //console.log("window_redraw fired.");
    //window.scrollTo(0, 0);

    const w = window.innerWidth;
    const h = window.innerHeight;

    q_nav_bar.style.height = vars.view.q_nav_bar_height+'px';
    q_nav_bar.style.display = display_array[+vars.view.navigation_active];

    let bars_height = 0;
    const bars = [...document.querySelectorAll('.bar')];


    bars.map(b => {
        const bbox = b.getBoundingClientRect();//offsetHeight;//
        if(b.style.display !== 'none') {
            bars_height += bbox.height;
            b.classList.remove('hidden');
        }
        //console.log(b, bbox);
    });


    const handle_box = page_handle.getBoundingClientRect();

    bounds.style.height = h-handle_box.height + 'px';

    ww = w;
    wh = ((h - vars.view.bottom_buffer) - bars_height) - handle_box.height;

    plot.style.width = ww + 'px';
    plot.style.height = wh + 'px';
    intro_box.style.height = wh + 'px';

    vars.view.width = ww;
    vars.view.height = wh;

    //console.log(ww, wh, bars_height);

    if (camera) {
        // visible_dimensions = visibleAtZDepth(-default_z, camera);
        // cam_base_pos.z = ((default_z / visible_dimensions.w) * vars.map.dims.w) + 2.0;
        // reset_default_z = cam_base_pos.z;
        // vars.max_zoom = reset_default_z;
        // ///alert(reset_default_z);
        //
        // let zg = Math.floor(Math.log(cam_base_pos.z)) + 1;
        // grid_resolution = z_mants[zg];

        camera.aspect = ww / wh;
        camera.updateProjectionMatrix();
        renderer.setSize(ww, wh);

        visible_dimensions = visibleAtZDepth(-default_z, camera);
        //cam_base_pos.z = ((default_z / visible_dimensions.w) * vars.map.dims.w) + 2.0;
        reset_default_z = ((default_z / visible_dimensions.w) * vars.map.dims.w) + 2.0;
        vars.max_zoom = reset_default_z;

        run_camera();
        run_optics();
        run_ticks();
    }

    q_nav.setup();

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

    // vars.view.title_bottom_offset = Math.round(vars.view.height/6);
    //
    // title_box.style.bottom = vars.view.title_bottom_offset+'px';
    // title_box.classList.remove('hidden');
    //
    // bounds.style.height = h-handle_box.height + 'px';









    intro_box_reposition();
}

function intro_box_reposition(){
    return;
    const bounds_pos = bounds.getBoundingClientRect();
    const title_pos = title_bar.getBoundingClientRect();
    const i_box = intro_box.getBoundingClientRect();
    //
    // alert(bounds_pos.top);

    let i_offset = title_pos.top-bounds_pos.top-i_box.height;
    if(i_offset < bounds_pos.top) i_offset = 12;

    intro_box.style.top = i_offset+'px';
    intro_box.classList.remove('hidden');
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

    let reg_0 = {}
    scene.background.getHSL(reg_0);
    utility_color.setHSL(reg_0.h, reg_0.s, reg_0.l * 1.2);
    vars.colors.eco_regions.select[0] = utility_color.getHex();
    utility_color.setHSL(reg_0.h, reg_0.s, reg_0.l * 1.5);
    vars.colors.eco_regions.select[1] = utility_color.getHex();

    //vars.colors.iso_bath.select = vars.colors.eco_regions.select;
    vars.user.group = new THREE.Group();
    scene.add(vars.user.group);
    map_sectors_group = new THREE.Group();

    renderer = new THREE.WebGLRenderer({
        powerPreference: "high-performance",
        antialias: true
    });
    renderer.setPixelRatio(1);
    renderer.setSize(ww, wh);

    //renderer.setClearColor(utility_color.fromArray([1.0, 0, 0]), 1.0);

    root_plane = new THREE.Plane(y_up);

    if(vars.helpers_active){

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

    }


    const ref_geom = make_hexagonal_shape(0.01);
    const ref_mat = new THREE[vars.mats.mapMarkersMaterial.type](vars.mats.mapMarkersMaterial.dict);
    ref_marker = new THREE.Mesh(ref_geom, ref_mat);
    ref_marker.name = 'ref_mark';
    ref_marker.rotateX(Math.PI / -2);
    scene.add(ref_marker);


    ref_marker_2 = new THREE.Mesh(ref_geom, ref_mat);
    ref_marker_2.name = 'ref_mark_2';
    ref_marker_2.rotateX(Math.PI / -2);
    scene.add(ref_marker_2);


    stats = new Stats();
    stats.dom.style.opacity = 0.2;
    document.body.appendChild(stats.dom);

    map_container = make_map_container(vars.map.test_bounds);
    map_container.add(map_sectors_group);
    map_container.add(m_selection_outlines);

    scene.add(map_container);
    map_plane.visible = false;

    dragControls(renderer.domElement, event_handler);

    keyControls(window, keyAction);

    grid_lines = make_grid_lines();
    scene.add(grid_lines);

    visible_dimensions = visibleAtZDepth(-default_z, camera);
    cam_base_pos.z = ((default_z / visible_dimensions.w) * vars.map.dims.w) + 2.0;
    reset_default_z = cam_base_pos.z;
    vars.max_zoom = reset_default_z;
    ///alert(reset_default_z);

    let zg = Math.floor(Math.log(cam_base_pos.z)) + 1;
    grid_resolution = z_mants[zg];

    ray_caster.params.Line.threshold = 0.005;
    ray_caster.params.Points.threshold = 0.025;

    event_handler('init', null);
    toggle_debug_tools_state(vars.debug_tool_state_default);

    plot.appendChild(renderer.domElement);

    // run_camera();
    // run_ticks();

    vars.view.init_state = true;

    console.log(map_container);
}

const wudi_dub_selecta = {
    object: new THREE.Group(),
    line_material: new THREE.LineBasicMaterial({color: vars.colors.dub_selecta}),
    buff: new Float32Array([1,0,0,-1,0,0]),
    geom: null,
    mark: [],
    dub_line: null,
    dub_box: null,
    dub_pos: new THREE.Vector3(),
    make: (e) => {
        wudi_dub_selecta.geom = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(wudi_dub_selecta.buff, 3));
        // wudi_dub_selecta.dub_line = new THREE.LineSegments(wudi_dub_selecta.geom, wudi_dub_selecta.line_material);
        // for(let c=0;c<2;c++) {
        //     const ref_geom = make_hexagonal_shape(0.01);
        //     const ref_mat = new THREE.MeshBasicMaterial({color: vars.colors.dub_selecta});
        //     ref_marker = new THREE.Mesh(ref_geom, ref_mat);
        //     ref_marker.rotateX(Math.PI / -2);
        //     wudi_dub_selecta.mark.push(ref_marker);
        //     wudi_dub_selecta.object.add(ref_marker);
        // }

        //const box_geometry = new THREE.BoxBufferGeometry(1, vars.bar_scale_width, 1);

        // const presto = new Float32Array([
        //     -0.1,0,0,
        //     -0.1,0,1.1,
        //     1.1,0,1.1,
        //     1.1,0,0,
        //     -0.1,0,0
        // ]);

        // const presto = new Float32Array([
        //     -0.5,0.1,-0.5,
        //     0.5,0.1,-0.5,
        //     0.5,0.1,0.5,
        //     -0.5,0.1,0.5,
        //     -0.4,0.1,-0.4,
        //     0.4,0.1,-0.4,
        //     0.4,0.1,0.4,
        //     -0.4,0.1,0.4,
        //     -0.5,-0.1,-0.5,
        //     0.5,-0.1,-0.5,
        //     0.5,-0.1,0.5,
        //     -0.5,-0.1,0.5,
        //     -0.4,-0.1,-0.4,
        //     0.4,-0.1,-0.4,
        //     0.4,-0.1,0.4,
        //     -0.4,-0.1,0.4
        // ]);

        // const ref_mat = new THREE.PointsMaterial({color: vars.colors.dub_selecta, size:0.05});
        // const box_geometry = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(presto, 3));
        // const ref_mat = new THREE.LineBasicMaterial({color: vars.colors.dub_selecta, linewidth:10});
        // const box_geometry = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(presto, 3));
        //box_geometry.translate(0.5, 0.0, 0.5);
        const ref_mat = new THREE.MeshBasicMaterial({
            color: 0xFFFFFF,
            transparent: true,
            opacity: 0.5,
            blending: THREE.NormalBlending,  //SubtractiveBlending,//AdditiveBlending, //AdditiveBlending, //THREE.NormalBlending, //
            depthWrite: false,
            depthTest: false
        });
        const box_geometry = new THREE.BoxBufferGeometry(1, vars.bar_scale_width, 1);
        box_geometry.deleteAttribute('uv');
        box_geometry.deleteAttribute('normal');
        box_geometry.translate(0.5, 0.0, 0.5);
        // wudi_dub_selecta.dub_box = new THREE.Line(box_geometry, wudi_dub_selecta.line_material);
        wudi_dub_selecta.dub_box = new THREE.Mesh(box_geometry, ref_mat);
        // wudi_dub_selecta.dub_box = new THREE.Points(box_geometry, ref_mat);
        // wudi_dub_selecta.dub_box = new THREE.Mesh(box_geometry, ref_mat);
        // before doing any updates, ensure the local matrix is set from postion/quaternion/scale:
        wudi_dub_selecta.dub_box.updateMatrix();
        wudi_dub_selecta.dub_box.userData.originalMatrix = wudi_dub_selecta.dub_box.matrix.clone();

        map_container.add(wudi_dub_selecta.dub_box);

        // wudi_dub_selecta.object.add(wudi_dub_selecta.dub_line);
        wudi_dub_selecta.dub_box.visible = false;

        // scene.add(wudi_dub_selecta.object);
    },
    rescale:(index, up, down) =>{
        const wudi_up = scene.getObjectByName('wudi_up');
        wudi_up.getMatrixAt(index, mu);
        mu.decompose(vw, qu, vu);
        wudi_dub_selecta.dub_box.position.set(vw.x, vw.y, down*-1);
        wudi_dub_selecta.dub_box.setRotationFromQuaternion(qu);
        wudi_dub_selecta.dub_box.scale.set(vu.x,vu.y,up+down);
        wudi_dub_selecta.dub_box.geometry.attributes.position.needsUpdate = true;
        wudi_dub_selecta.dub_box.geometry.computeBoundingBox();
        wudi_dub_selecta.dub_box.geometry.computeBoundingSphere();
    },
    // set: (p1, p2) =>{
    //
    //     const position = wudi_dub_selecta.geom.getAttribute('position');
    //     position.setXYZ(0, p1.x,p1.y,p1.z);
    //     position.setXYZ(1, p2.x,p2.y,p2.z);
    //     wudi_dub_selecta.geom.attributes.position.needsUpdate = true;
    //     wudi_dub_selecta.dub_line.geometry.computeBoundingSphere();
    //     for(let c=0;c<2;c++) {
    //         wudi_dub_selecta.mark[c].position.set(position.array[c * 3], position.array[c * 3 + 1], position.array[c * 3 + 2]);
    //     }
    // },
    set_from_point: (pid) =>{
        wudi_dub_selecta.dub_box.visible = true;
        const t_ref = scene.getObjectByName('ref_mark');
        t_ref.visible = false;
        const ref_point = vars.data.wudi_index.indexOf(pid);

        const wudi_down = scene.getObjectByName('wudi_down');
        wudi_down.getMatrixAt(ref_point, mu);
        mu.decompose(vw, qu, vu);
        const down = vu.z;

        const wudi_up = scene.getObjectByName('wudi_up');
        wudi_up.getMatrixAt(ref_point, mu);
        mu.decompose(vw, qu, vu);
        const up = vu.z;

        wudi_dub_selecta.dub_box.position.set(vw.x, vw.y, down*-1);
        wudi_dub_selecta.dub_box.setRotationFromQuaternion(qu);
        wudi_dub_selecta.dub_box.scale.set(vu.x,vu.y,up+down);

        const pt = vars.data.wudi_points.raw.data[ref_point];

        vw.set(pt[1],pt[0],0.0);
        vk.set(pt[5],pt[4],0.0);
        vu.subVectors(vk,vw);
        vc.crossVectors(vu,z_in).normalize().multiplyScalar(-0.1);
        vc.add(vu.multiplyScalar(0.5).add(vw));
        //
        map_container.localToWorld(vc);
        // t_ref.position.copy(vc);
        // t_ref.visible = true;
        map_container.localToWorld(vw);
        map_container.localToWorld(vk);

        vw.set(pt[3],pt[2],0.0);
        vu.copy(vw);
        map_container.localToWorld(vu);
        wudi_dub_selecta.dub_pos.copy(vw);

        return [vc.clone(), vw.clone()];
    },
}

const mover = {
    name: 'synthetic_displacement',
    d: new THREE.Vector3(),
    d_mem: 0,
    z_amt: 0,
    z_sta: 0,
    ac: new THREE.Vector3(),
    vl: new THREE.Vector3(),
    pos: new THREE.Vector3(),
    del_pos: new THREE.Vector3(),
    tgt: new THREE.Vector3(),
    move_vector: null,
    attenuation: 1.0,
    speed: 0.0009,
    vd: 0,
    rv: 0,
    is_moving: false,
    is_rotating: false,
    stopped: false,
    roto: {
        object: null,
        control: null,
        position: null,
        offset: new THREE.Vector3(),
        target: new THREE.Vector3(),
        amount: null,
        delta: 0,
        last: 0,
        direction: 1
    },
    ctr: {
        t: 0.0,
        set(at){
            //#//catch att the transforms on user_position.actual.
            //#//why is this blocking?
            if(mover.is_rotating || mover.is_moving){
                mover.stopped = false;
                run_camera();
                run_optics();
                run_ticks();
                refresh_sectors();
                adaptive_scaling_wudi();
            }

            if(mover.is_moving){
                mover.ctr.t = at;
                mover.move();
                mover.move_vector.copy(mover.pos);
            }

            if(mover.is_rotating){
                mover.rotate();
            }

            if(!mover.is_rotating && !mover.is_moving && !mover.stopped) {
                //assume final form.
                mover.stopped = true;
            }
            return mover.stopped;
        }
    },
    cancel(){
        //called by any drag event.
        this.is_moving = false;
        this.is_rotating = false;
        this.d.set(0,0,0);
        this.vl.set(0,0,0);
    },
    set_target(control_vector, target_pos, zoom=null){

        this.pos.copy(control_vector);
        this.move_vector = control_vector; //inherit
        this.tgt.copy(target_pos);
        vw.subVectors(this.tgt, this.pos);
        this.d_mem = vw.length();

        this.speed = this.d_mem/1000;

        if(zoom) {
            this.z_sta = cam_base_pos.z;
            this.z_amt = zoom;
        }else{
            this.z_sta = null;
        }

        this.is_moving = true;
        //obs_handler({z: z_start, d: this.d_mem});
    },
    set_rotation_target(object, control_position, pos, target_offset, target_pos){
        //mover.set_rotation_target(cube, camera_projected, user_position.actual, dub_select[0], dub_select[1]);
        ///cube, camera.position, user_position, target_position(wudi point).
        this.roto.object = object;
        this.roto.control = control_position;
        this.roto.position = pos;
        this.roto.offset.copy(target_offset);
        this.roto.target.copy(target_pos);
        this.is_rotating = true;

        vk.subVectors(this.roto.position, this.roto.control);
        vw.subVectors(this.roto.position, vk).normalize();
        // //#//yellow.
        // arrow_helper_4.position.copy(this.roto.position);
        // arrow_helper_4.setDirection(vw);

        vc.copy(this.roto.target);
        map_container.localToWorld(vc);
        //because target is a projection.
        vu.copy(this.roto.offset);
        vk.subVectors(vc, vu).normalize();

        //vk.add(this.roto.position);

        // //#//RED.
        // arrow_helper_3.position.copy(vc);
        // arrow_helper_3.setDirection(vk);


        let r = vw.angleTo(vk);
        // if (vk.dot(cam_right) >= 0) r *= -1.0;
        this.roto.direction = (vk.dot(cam_right) >= 0) ? -1 : 1;
        // console.log('rotation:', r);
        this.roto.amount = r;//Math.PI/2;//r;90º
        this.roto.delta = 0;
        this.roto.last = 0;
    },
    rotate(){

        const m = this.d.length();
        const d = (this.roto.amount*(1-(m/this.d_mem)));
        const r = d-this.roto.last;
        this.roto.object.rotateOnWorldAxis(y_up, r*this.roto.direction);
        this.roto.last = d;

        //obs_handler({amt:this.roto.amount, d:d,r: r.toFixed(3)});
        //
        // vk.subVectors(this.roto.position, this.roto.control);
        // vw.subVectors(this.roto.position, vk).normalize();
        // // //#//yellow.
        // // arrow_helper_4.position.copy(this.roto.position);
        // // arrow_helper_4.setDirection(vw);
        //
        // vc.copy(this.roto.target);
        // map_container.localToWorld(vc);
        // //because target is a projection.
        // vu.copy(this.roto.offset);
        // vk.subVectors(vc, vu);//.normalize();
        //
        // // //#//RED.
        // // arrow_helper_3.position.copy(vu);
        // // arrow_helper_3.setDirection(vk);
        //
        // let r = vw.angleTo(vk);
        // if(Math.abs(r) < 0.1) {
        //     this.is_rotating = false;
        //     return;
        // }
        // if (vk.dot(cam_right) > 0) r *= -1.0;
        // // r *= 0.9;
        // //obs_handler({r: r.toFixed(3)});
        // this.roto.object.rotateOnWorldAxis(y_up, r/30);

    },
    move(){
        vw.subVectors(this.tgt, this.pos);
        const t_delta = this.ctr.t*1000;
        this.d.lerp(vw, this.attenuation);
        const m = this.d.length();
        const delta_p = this.del_pos.distanceTo(this.pos);
        this.vd =  delta_p / t_delta;
        const r = 1 - (this.vd * t_delta) / m;
        this.ac.copy(this.d).normalize().multiplyScalar(this.speed);
        if (r > 0) this.vl.add(this.ac).multiplyScalar(r);
        if (m < this.speed) {//0.0001){
            this.is_rotating = false;
            this.is_moving = false;
        }
        this.del_pos.copy(this.pos);
        this.pos.add(this.vl);
        //this.d.multiplyScalar(0.99999);
        if(this.z_sta !== null) cam_base_pos.z = this.z_sta-(this.z_amt*(1-(m/this.d_mem)));
        //obs_handler({d:1-(m/this.d_mem).toFixed(3)});
        //obs_handler({d: m});
    }
}

const q_nav = {
    q_nav_event: (e) => {
        const rel = e.target.nodeName === 'polygon' ? e.target.parentNode : e.target;

        q_nav.hover_state = (rel.getAttribute('meta') === 'wudi_points');
        const relevant = element_info_filter[rel.getAttribute('meta')](rel.getAttribute('index'));

        vars.info.set_state(true);
        vars.info.set_text([relevant]);
        vars.info.set_position(e.pageX, e.pageY-100, null);

        if(rel.getAttribute('meta') === 'mpa_s'){
            const t_elem = scene.getObjectByName('mpa_s-'+rel.getAttribute('index'));
            if(!t_elem) {
                console.log(rel);
                return false;
            }
            t_elem.geometry.computeBoundingBox();
            t_elem.geometry.boundingBox.getCenter(vc);

        }else if(rel.getAttribute('meta') === 'places_data'){
            const places_inst = scene.getObjectByName('places_data').children[0];
            vc.fromArray(places_inst.userData.td.position[rel.getAttribute('index')]);
        }else if(rel.getAttribute('meta') === 'wudi_points') {
            vc.copy(wudi_dub_selecta.dub_pos);
        }

        map_container.localToWorld(vc);
        grid_lines.visible = true;
        grid_lines.position.copy(vc);


        //console.log(rel.getAttribute('meta'), rel.getAttribute('index'));
        //map_container



        //grid_lines

        obs_handler(relevant);//{s:rel.getAttribute('meta'), i:rel.getAttribute('index')});
    },
    hover_state: false,
    area_strip: q_nav_bar.querySelector('.area-strip'),
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
    last_point_selected:null,
    touch_trace:{
        pos_x: null,
        delta_x: null
    },
    draw_strip: (reg_id, items, start_index) => {
        const has_container = q_nav.area_strip.querySelector('.area-div-container');
        //const svg_circle = document.getElementById('basic-circle');
        const svg_hexagon = document.getElementById('basic-hexagon');
        //const svg_inside_circle = document.getElementById('within-circle');

        if(has_container){
             if(has_container.id === 'sg-'+reg_id){
                 return;
             }else{
                 if(!q_nav.strip_canvases.hasOwnProperty(has_container.id)) {
                     q_nav.strip_canvases[has_container.id] = has_container;//.cloneNode(true);
                 }
             }
        }

        if(q_nav.strip_canvases.hasOwnProperty('sg-'+reg_id)) {
            q_nav.area_strip.innerHTML = '';
            q_nav.area_strip.appendChild(q_nav.strip_canvases['sg-'+reg_id]);//.cloneNode(true));
        }else{
            const container = document.createElement("div");
            container.classList.add("area-div-container");
            container.classList.add("row");

            container.setAttribute('id', 'sg-'+reg_id);
            const places_instance = scene.getObjectByName('places_data').children[0];
            const protected_instance = scene.getObjectByName('mpa_s').children[0];

            const protected_color = utility_color.fromArray(vars.colors.mpa_s_designated).getHex();
            const places_color = utility_color.fromArray(vars.colors.places).getHex();

            const transform_hexagon = (hex_svg_dom, scale) => {
                hex_svg_dom.style.height = Math.ceil(24*scale)+'px';
                // const el = hex_svg_dom.querySelector('polygon');
                // const k_w = ((128/scale)/2)*(1-scale).toFixed(3);
                // el.setAttribute("transform",`scale(${scale.toFixed(3)}) translate(${k_w} ${k_w})`);
                return Math.ceil(24*scale)+4;
            }

            // console.log(start_index, vars.data.wudi_index)

            for(let c = 0; c<items;c++){

                // r_div.classList.add("column-label");

                let index = null;
                if(reg_id === 'g-1'){
                    index = vars.data.wudi_index[start_index+c];
                }else{
                    index = start_index+c;
                }

                const r_div = document.createElement("div");
                r_div.classList.add("area-div");
                r_div.classList.add("row-stack");
                r_div.setAttribute('meta','wudi_points');//
                r_div.setAttribute('index', vars.data.wudi_index.indexOf(index));//
                r_div.addEventListener('mouseover', q_nav.q_nav_event, false);



                const plb = vars.data.wudi_assoc.raw.data[index];
                //console.log('plb',plb);

                const _has_protected = plb[1] !== null;
                const _has_inside_protected = plb[3] !== null;
                const _has_place = plb[4] === null ? false: vars.data.places_data.lookup_table.hasOwnProperty(plb[4]);

                const allowed = true;
                let r_height = 0;
                let in_area = null;

                if(allowed) {
                    if (_has_inside_protected) {

                        if (Array.isArray(plb[3])) {
                            in_area = plb[3][0];
                        } else {
                            in_area = plb[3];
                        }

                        const protected_scale = protected_instance.userData.td.sample_raw[in_area];
                        const hexa = svg_hexagon.cloneNode(true);
                        ///const circle = svg_inside_circle.cloneNode(true);
                        hexa.removeAttribute('id');
                        hexa.classList.add('svg-minimized');
                        hexa.classList.add('area-acg-protected-inside');

                        hexa.setAttribute('index',in_area);//
                        hexa.setAttribute('meta','mpa_s');//

                        hexa.style.fill = vars.colors.hex_css(protected_color);

                        r_height += transform_hexagon(hexa, protected_scale / 4);
                        //circle.querySelector('circle').setAttribute('r', (60 / 4) * protected_scale);

                        hexa.addEventListener('mouseover', q_nav.q_nav_event, false);
                        r_div.appendChild(hexa);
                    }

                    if (_has_protected && (plb[1] !== parseInt(in_area))) {
                        // console.log(in_area, plb);
                        const protected_scale = protected_instance.userData.td.sample_raw[plb[1]];
                        const hexa = svg_hexagon.cloneNode(true);
                        hexa.removeAttribute('id');
                        hexa.classList.add('svg-minimized');
                        hexa.classList.add('area-acg-protected');

                        hexa.setAttribute('index',parseInt(plb[1]));//
                        hexa.setAttribute('meta','mpa_s');//
                        //console.log(h_color);
                        hexa.style.stroke = vars.colors.hex_css(protected_color);
                        r_height += transform_hexagon(hexa, protected_scale / 4);
                        //circle.querySelector('circle').setAttribute('r', (60 / 4) * protected_scale);
                        hexa.addEventListener('mouseover', q_nav.q_nav_event, false);
                        r_div.appendChild(hexa);
                    }



                    if (_has_place) {
                        const place_data_index = vars.data.places_data.lookup_table[plb[4]];
                        const place_scale = places_instance.userData.td.sample_raw[place_data_index];
                        const hexa = svg_hexagon.cloneNode(true);
                        hexa.removeAttribute('id');
                        hexa.classList.add('svg-minimized');
                        hexa.classList.add('area-acg-place');

                        hexa.setAttribute('index',place_data_index);//
                        hexa.setAttribute('meta','places_data');//
                        hexa.style.fill = vars.colors.hex_css(places_color);

                        r_height += transform_hexagon(hexa, place_scale / 4);

                        // console.log(place_scale);
                        //circle.querySelector('circle').setAttribute('r', (60 / 5) * place_scale);
                        hexa.addEventListener('mouseover', q_nav.q_nav_event, false);
                        r_div.appendChild(hexa);
                    }
                }



                // r_div.style.left = c*vars.q_nav.segment_width+'px';
                // r_div.style.top = (20-(r_height/2))+'px';///   c*vars.q_nav.segment_width+'px';
                // r_div.addEventListener('mouseover', q_nav.q_nav_event, false);
                // r_div.setAttribute('index',index);//
                // r_div.setAttribute('meta','wudi_points');//

                container.appendChild(r_div);

            }

            q_nav.area_strip.innerHTML = '';
            q_nav.area_strip.appendChild(container);
        }

        //plot.focus();
        return false;
    },
    get_point: () => {
        const rc = Math.round(q_nav.offset*q_nav.region_length);//+1;
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
            //console.log('q_nav called set_geo_region');
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
            //q_nav.optimise_strip();
        }

        return false;
    },
    reposition: () => {
        //console.log('q_nav called reposition');
        //q_nav.optimise_strip();
        q_nav.label.innerHTML = `${q_nav.get_point()}/${q_nav.region_length}`;
        q_nav.area_strip.style.width = (q_nav.region_width_px)+'px';
        q_nav.area_strip.style.left = ((vars.view.width/2.0)-((q_nav.offset*q_nav.region_width_px)-(vars.q_nav.segment_width/2)))+'px';
        return false;
    },
    setup: () => {
        q_nav.label_top = (vars.view.q_nav_bar_height/2)+(q_nav.label.getBoundingClientRect().height/-2);
        q_nav.label.style.top = q_nav.label_top+'px';
        q_nav.label.style.left = (vars.view.width/2.0)+'px';
        q_nav.base_position.style.left = (vars.view.width/2.0)-(vars.q_nav.segment_width/2.0)+'px';
        q_nav.base_position.style.width = (vars.q_nav.segment_width)+'px';
        q_nav.base_position.style.height = vars.view.q_nav_bar_height+'px';
        q_nav.area_strip.style.height = vars.view.q_nav_bar_height+'px';
    },
    init: () => {
        dragControls(q_nav_bar, q_nav.event_handler);
        q_nav_bar.disable_wheel();
        q_nav.setup();
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
                //q_nav.touch_trace.delta_x = primary.x_d;
            }else{
                pos_x = evt_object_n.x;
                //delta_x = q_nav.touch_trace.delta_x;
            }
        }else{
            action = type;
            pos_x = evt_object_n.actual.x;
            delta_x = evt_object_n.delta.x;
        }
        //obs_handler({q_nav: action, p:pos_x, d:delta_x});

        if(action === 'drag'){
            q_nav.offset_pixels += delta_x;
            q_nav.offset = util.naturalize_on_loop(r_interval/q_nav.region_length, true);
            q_nav.reposition();
            const target_pid = vars.data.geo_regions[q_nav.region_id][q_nav.get_point()-1];
            //const target_pid = vars.data.geo_regions[q_nav.region_id][q_nav.get_point()-1];
            if(target_pid !== q_nav.last_point_selected){
                move_to_point(vars.data.wudi_index.indexOf(target_pid));
                ///move_to_point(target_pid);
                q_nav.last_point_selected = target_pid;
            }

            // const dub_select = wudi_dub_selecta.set_from_point(target_pid);
            // mover.set_target(user_position.actual, dub_select[0]);
            // mover.set_rotation_target(cube, camera_projected, user_position.actual, dub_select[0], dub_select[1]);
            //mover.set_rotation_target(cube, camera.position, user_position.actual, dub_select[1]);
            //move_map_to_point(target);

        }else if(action === 'click' || action === 'touch-click'){
            const pfx = (vars.view.width/2.0)-pos_x;
            const fx = (vars.view.width/2.0) - Math.round(pfx/vars.q_nav.segment_width)*vars.q_nav.segment_width;
            const click_pos = (((vars.view.width/2.0)-(q_nav.offset*q_nav.region_width_px))-fx)*-1;
            const click_offset = (click_pos/q_nav.region_width_px);
            const click_ref = Math.round(click_offset*q_nav.region_length);

            if(click_ref >= 0 && click_ref <= q_nav.region_length){
                q_nav.offset = click_offset;
                q_nav.reposition();
                const target_pid = vars.data.geo_regions[q_nav.region_id][q_nav.get_point()-1];
                move_to_point(target_pid);
                // const dub_select = wudi_dub_selecta.set_from_point(target_pid);
                // mover.set_target(user_position.actual, dub_select[0]);
                // mover.set_rotation_target(cube, camera_projected, user_position.actual, dub_select[0], dub_select[1]);
                ///mover.set_target(user_position.actual, q_nav.get_point_vector(target_pid));
                //move_map_to_point(target_pid);
            }
        }else{
            q_nav.offset_pixels = q_nav.offset*q_nav.region_width_px;
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

    function make_references(obj, custom_length=null){
        vars.refs[obj.name] = [];
        let keys, data, count;

        if(custom_length){
            keys = obj.raw.slice(0, custom_length);
            data = obj.raw.slice(0, obj.raw.length-1);
            count = obj.raw.length-1;
        }else{
            keys = obj.raw.keys;
            data = obj.raw.data;
            count = obj.raw.data.length;
        }

        for (let i = 0; i < count; i++) {
            vars.refs[obj.name].push(new dataClass(i).set(keys, data[i]));
        }

        //console.log('make_references', obj.name, vars.refs[obj.name]);
    }

    obj_list.forEach(obj => {
        switch (obj.type) {
            case 'csv_text':
                obj.raw = array_chuk(array_auto(obj.raw), obj.columns);

                if(obj.style === 'data'){
                    make_references(obj, obj.columns);
                } else{
                    vars.data[obj.name] = obj;
                    plot_data(obj);
                }

                break;
            case 'json':
                vars.data[obj.name] = obj;
                plot_data(obj);
                break;
            case 'json-ser':
                //console.log('json-ser', obj.name);
                if (obj.name === 'places_data' || obj.name === 'mpa_s'){
                    vars.data[obj.name] = obj;
                    make_references(obj);
                    //console.log('what places_data', obj);
                    plot_data(obj);
                }
                if (obj.name === 'wudi_points') {
                    vars.data[obj.name] = obj;
                    make_references(obj);
                    wudi_plot(obj);
                }
                if (obj.name === 'wudi_assoc') {
                    vars.data[obj.name] = obj;
                    make_references(obj);
                    //console.log(obj);
                }
                if (obj.name === 'wudi_data') {
                    wudi_set_data([obj]);
                }
                break;
            default:
                console.log(`callback found no data of type ${obj.type}`);
        }
    });
    console.log(vars.refs);
    return true;
}

let payload = [];
for (let i = 0; i < 10; i++) {
    payload.push(i);
}

const post_obj_list = [
    {"url": "/map", "table": "places_test", "type": "json-ser", "name": "places_data", "style":"point", "tck": [0, 0, 0], "geom_index": 11},
    {"url": "/map", "table": "protected_regions", "type": "json-ser", "name": "mpa_s", "style":"point", "tck": [0, 0, 0]},
    {"url": "/wudi", "table": "turn_table", "type": "json-ser", "name": "wudi_points", "tck": util.shuffle_array(payload)},
    {"url": "/wudi", "table": "assoc", "type": "json-ser", "name": "wudi_assoc", "tck": util.shuffle_array(payload)},
    {"url": "/wudi", "tim": "40", "type": "json-ser", "name": "wudi_data", "tck": [0, 0, 0]},
]

const obj_list = [
    //{url: './data/v2-raw-protected-14.txt', type: 'csv_text', name: 'protected_regions', style: 'point', columns: 14, geom_index: 11},
    //{url: './data/raw-georegions-11.txt', type: 'csv_text', name: 'eco_regions', columns: 11, style: 'line', geom_index: 10, is_complex: true},
    {url: './data/v2-raw-geonames-1.txt', type: 'csv_text', name: 'geonames', columns: 1, style: 'data', geom_index: 0},
    {url: './data/raw-isobath-100m-1.txt', type: 'csv_text', name: 'isobath', columns: 1, style: 'multi_line', geom_index: 0}
]

let initial_load = false;

// 👉️ START EVERYTHING HERE

async function load_complete(situation) {
    vars.loaded = true;
    console.log('all loaded');
    console.log(situation);

    adaptive_scaling_wudi();

}

async function load_datum(r) {
    const get_secondary = await fetchAll(obj_list, loader_notify).then(object_list => fetch_callback(object_list));
    const get_data = await fetchPOST(post_obj_list, loader_notify).then(object_list => fetch_callback(object_list));
    const get_last = draw_sectors();
    initial_load = true;
    return [get_data, get_secondary, get_last, r];
}

async function load_primary(r){
    window_redraw(true);
    init();
    animate();

    q_nav.init();
    wudi_dub_selecta.make(null);
    //wudi_sub_selecta.make(null);

    load_datum(r).then(r => load_complete(r));
}

async function window_dom_prepare(){
    //window.scrollTo(0, 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const buttons = [...document.querySelectorAll(".button")];
        buttons.map(b => {
        const svg_check_zero = document.getElementById("check-box-0").cloneNode(true);
        const svg_check_one = document.getElementById("check-box-1").cloneNode(true);
        b.insertBefore(svg_check_one, b.firstChild);
        b.insertBefore(svg_check_zero, b.firstChild);
        b.parentNode.addEventListener('mouseup', dom_button_check_click);
        dom_button_check_box_set_state(b.id, true);

        const col = utility_color.fromArray(vars.colors[b.id]).getHex();
        const r_col = vars.colors.hex_css(col);
        b.style.fill = r_col;
        b.style.color = r_col;
    });

    // const graph_controls = document.getElementById('graph-controls');
    const graph_controls_items = {
        'graph-close': 'check-box-1',
        'graph-download': 'download-icon'
    }

    Object.entries(graph_controls_items).map(kv => {
        const el = document.getElementById(kv[0]);
        const legend_mark = document.getElementById(kv[1]);
        const kma = legend_mark.cloneNode(true);
        kma.removeAttribute('id');
        el.appendChild(kma);
    });

    function scroll_to_downloads(){
        const box = document.getElementById('output').getBoundingClientRect();
        window.scrollTo({ top: box.top, behavior: 'smooth' });
    }


    document.getElementById('graph-close').addEventListener('mouseup', vars.selecta.wudi.points_deselect);
    document.getElementById('graph-download').addEventListener('mouseup', scroll_to_downloads);

    //
    // const graph_close = document.getElementById("graph-close");
	// const svg_check_one = document.getElementById("check-box-1").cloneNode(true);
	// svg_check_one.removeAttribute('id');
	// graph_close.appendChild(svg_check_one);
    //
    // const dom_download = document.getElementById("graph-close");
	// const svg_check_one = document.getElementById("check-box-1").cloneNode(true);
	// svg_check_one.removeAttribute('id');
	// dom_close.appendChild(svg_check_one);


    axis_planes.push({
        name: 'x',
        plane: new THREE.Plane(),
        position: new THREE.Vector3(0, -1, 0),
        up: new THREE.Vector3(),
        mark: make_position_mark(1.0),
        // markers_geoms: make_markers_group(),
        markers_divs: make_ticks_divs()
    });

    axis_planes.push({
        name: 'z',
        plane: new THREE.Plane(),
        position: new THREE.Vector3(-1, 0, 0),
        up: new THREE.Vector3(),
        mark: make_position_mark(1.0),
        // markers_geoms: make_markers_group(),
        markers_divs: make_ticks_divs()
    });

    const years = document.getElementById('years_container');
    const months = document.getElementById('months_container');

    await vars.dom_time.populate('years');
    years.style.display = 'none';
    years.style.display = 'flex';

    await vars.dom_time.populate('months');
    months.style.display = 'none';

    vars.info.dom_element.classList.remove('hidden');
    obs.classList.remove('hidden');


    // const legend_elements = {
    //     'place':'area-acg-place',
    //     'mpa':'area-acg-protected',
    //     'mpa-interior':'area-acg-protected-inside',
    //     'legend-obs':'area-acg-obs',
    //     'legend-obs-normal':'area-acg-obs-normal'
    // };


    const legend_elements = {
        'places':'basic-hexagon',
        'mpa_s_designated':'mpa-shape',
        'mpa_s_proposed':'mpa-shape',
        'isobath':'isobath-shape'
    };



    Object.entries(legend_elements).map(kv => {
        const el = document.getElementById(kv[0]);
        const legend_mark = document.getElementById(kv[1]);
        const kma = legend_mark.cloneNode(true);
        kma.removeAttribute('id');

        kma.style.width = '24px';
        kma.style.height = '24px';

        // const f_col = utility_color.fromArray(vars.colors[kv[0]]).getHex();
        // console.log(kv[0], vars.colors.hex_css(f_col, true));
        //

        kma.style.fill = vars.colors.rgba_arr_to_css(vars.colors[kv[0]]);

        el.appendChild(kma);
    });









    //const page_handle = document.getElementById('page-handle-icon');
    const h_bars = [{t:'up',s:'none'},{t:'down',s:'block'}].map(t=>{
        const page_handle_svg = document.getElementById('h-bar-'+t.t);
        page_handle_svg.style.display = t.s;
        page_handle.appendChild(page_handle_svg);
    });

    const intro_button = document.getElementById('intro-button');
    intro_button.param = 'intro';
    intro_button.addEventListener('mouseup', window_state_control);

    const instructions_button = document.getElementById('instructions-button');
    instructions_button.param = 'instructions';
    instructions_button.addEventListener('mouseup', window_state_control);

    // const instructions_control = document.getElementById('instructions');
    // instructions_control.param = 'intro';
    // instructions_control.addEventListener('mouseup', window_state_control);
    //<!--		recenter,camera-motion,instructions,navigation -->


    plot_controls.classList.add('hidden');

    document.getElementById('recenter').addEventListener('mouseup', control_recenter_map);
    document.getElementById('camera-motion').addEventListener('mouseup', control_camera_behavior);
    document.getElementById('navigation').addEventListener('mouseup', control_navigation_state);
    document.getElementById('instructions').addEventListener('mouseup', control_instructions_state);
    document.getElementById('mpa_s').addEventListener('mouseup', control_mpa_s_state);



    function window_scroll_control(e){
        e.preventDefault();
        const h_state = window.scrollY > 0;
        vars.suspend = h_state;
        set_handle_sate(h_state);
        if(vars.state_interacted) {
            //document.getElementById('bounds-overlay').style.display = display_array[+(h_state)];
            document.getElementById('bounds-overlay').fader(+(h_state), vars.suspend);///style.display = display_array[+(h_state)];
        }

    }

    function set_handle_sate(h_state){

        const states = ['down','up'];
        const t_s = states[+h_state];

        states.map(t=>{
            const page_handle_svg = document.getElementById('h-bar-'+t);
            page_handle_svg.style.display = t === t_s ? 'block' : 'none';
        });
    }

    function window_handle_control(e){
        if(e.target.id === 'bounds-overlay' && !vars.state_interacted) return;

        const h_state = window.scrollY === 0;
        //set_handle_sate(h_state);

        if(!h_state){
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }else{
            const handle_box = page_handle.getBoundingClientRect();
            window.scrollTo({ top: handle_box.top, behavior: 'smooth' });
        }
        e.preventDefault();
    }

    window.onscroll = window_scroll_control;//function() {window_scroll_control()};
    page_handle.addEventListener('mouseup', window_handle_control, false);

    const bounds_overlay = document.getElementById('bounds-overlay');//.style.display = 'none';
    bounds_overlay.addEventListener('mouseup', window_handle_control, false);

    bounds_overlay.fader = function(f){

        const s = this.style;
        s.display = display_array[f];


        // s.display = "block";
        // s.opacity = 1;//Math.abs(f-1);
        // function fadeout(){(s.opacity -= .1) < 0? s.display="none" : requestAnimationFrame(fadeout)}
        // function fadein(){(s.opacity += .1) > 1? s.display="block" : requestAnimationFrame(fadein)}
        // (f === 0) ? fadeout() : fadein();
    }

    const instructions_slide = document.getElementById('instructions-slide');
    [...plot_controls.querySelectorAll('.control-button')].map(cd =>{
        const control_item = cd.cloneNode(true);

        const target = instructions_slide.querySelectorAll('.icon-'+control_item.id)[0];
        control_item.className = "";
        control_item.classList.add('instructions-icon');
        control_item.removeAttribute('id');
        target.prepend(control_item);
    })
//     bounds_overlay.fader = (f) => {
//         const s = this.parent.style;
//         alert(s,f);
// // s.opacity = 1;
// // (function fade(){(s.opacity-=.1)<0?s.display="none":setTimeout(fade,40)})();
//     }



    vars.state_interacted = false;

    [...document.querySelectorAll('.is-overlay')].map(wp => {
        wp.style.backgroundColor = vars.colors.hex_css(vars.colors.window, vars.colors.info_bk_opacity);
    });

    return true;
}

async function window_state_control(e){

    const from_control = e.target;// e.target.closest('.control-button') ? e.target.closest('.control-button') : e.target;

    function state_one(){
        const intro_slide = document.getElementById('intro');
        intro_slide.style.display = 'none';

        const instructions_slide = document.getElementById('intro-instructions');
        instructions_slide.style.display = 'block';

        plot_controls.classList.remove('hidden');
        //intro_box_reposition();
    }

    function state_two(){
        // const intro_slide = document.getElementById('intro');
        // intro_slide.style.display = 'none';

        const instructions_slide = document.getElementById('intro-instructions');
        instructions_slide.style.display = 'none';

        const instructions_control = document.getElementById('instructions');
        instructions_control.classList.remove('active');

        const instructions_button = document.getElementById('instructions-button');
        instructions_button.style.display = 'none';

        // bounds_overlay.fader('hi');
        //document.getElementById('bounds-overlay').style.display = 'none';
        document.getElementById('bounds-overlay').fader(0);
        // plot_controls.classList.remove('hidden');
        vars.state_interacted = true;
    }

    switch (from_control.param) {
        case 'intro':
            state_one();
            break
        case 'instructions':
            state_two();
            break
        default:
            console.log(e.target.closest('.control-button'));
            alert(e.target.param);
    }

    return true;
}


window.addEventListener('DOMContentLoaded', (event) => {
    console.log('dom loaded. continuing');
    //document.requestFullscreen();
    window.addEventListener('resize', window_redraw);
    window_dom_prepare().then(r => load_primary(r));
});


