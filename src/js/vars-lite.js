import {AdditiveBlending} from "three";

const vars = {
	// window_color: 0x0f1621,
	suspend: false,
	animationFrame: null,
	DEBUG: false,
	title_string:'Mean daily observations of WUDI from 1980 to 2020',
	graph_styles: {3:'all', 4:'year', 6:'month', 8:'daily'},
	static_path:'./data',
	previous_keys: [],
	helpers_active: false,
	debug_tool_state: false,
	debug_tool_state_default: false,
	grid_visible: false,
	arrow_helper_visible: false,
	position_marks_visible: false,
	sector_draw: true,
	loader_notify_messages: false,
	degree_scale: 2,
	degree_scale_str: 'deg_2',
	depth_engage_distance: 8.0,
	line_strings_engage_distance: 20.0,
	polygons_engage_distance: 30.0,
	depth_max: 5000.0,
	levels:5,
	min_zoom:0.125,
	mpa_s_visible: true,
	q_nav:{
		segment_width: 20,
		height:24
	},
	layers:{
		allow:['contours', 'mpa_s', 'polygons'] ///, 'contours'] ///'polygons','line_strings',
	},
	map:{
		test_bounds: [-7.0, 29.0, 37.0, 49.0]
	},
	user: {
		mouse: {},
		selection: null
	},
	view: {
		init_state: false,
		width: null,
		height:null,
		q_nav_bar_height: 48,
		graph_obj_height: 180,
		bottom_buffer: 4,
		title_bottom_offset: 32,
		map_vertical_deg_offset: 2.0,
		bottom_offset: 70,
		bottom_bar_height: 32,
		x_axis_inset: 10,
		y_axis_inset: 10,
		camera_auto_affine: false,
		navigation_active: false,
		instructions_active: false
	},
	wudi_point_cache: {},
	data: {},
	mats: {
		mapMarkersMaterial:{
			type: 'MeshBasicMaterial',
			dict: {
				color: 0xFF00FF,
				side: 'DoubleSide',
				transparent: true,
				opacity:1.0
			}
		},
		mpaMaterial:{
			type: 'MeshBasicMaterial',
			dict: {
				color: 0x00FF00,
				side: 'FrontSide',
				transparent: true,
				depthTest: false,
                depthWrite: false,
				opacity:0.25
			}
		},
		polygonsMaterial:{
			type: 'MeshBasicMaterial',
			dict: {
				color: 0x444444,
				// color: 0x222222,
				side: 'FrontSide',
				// transparent: true,
				// depthTest: false,
                // depthWrite: false,
				// opacity:0.25
			}
		},
		contours:{
			type: 'LineBasicMaterial',
			dict: {
				color: 0x222222
			}
		},
		line_strings:{
			type: 'LineBasicMaterial',
			dict: {
				color: 0x777777
			}
		}
	},
	colors:{
		downwelling:[1.0, 0.4, 0.2],
		upwelling:[0.2, 0.6, 1.0],

		mpa_s_designated:[0.1, 1.0, 0.1, 0.25],
		mpa_s_proposed:[0.1, 1.0, 0.1, 0.1],
		places:[1.0, 1.0, 0.1, 0.75],
		isobath:[0.5, 0.5, 0.5, 0.5],

		info_bk_opacity: 0.85,
		window: 0x1D2733, //0xFFFFFF,  //
		chart_tick: 0x888888,
		chart_guide: 0x444444,
		dub_selecta: 0xFFFF00,
		contours: {
			base: 0x4444CC,
			select: [0x4444CC, 0x4444CC]
		},
		eco_regions:{
			select: [0xFFFFFF, 0x000000]
		},
		wudi:{
			select: [0x660066, 0xFF00FF]
		},
		iso_bath:{
			select: [0x333366, 0x4444FF]
		},
		hex_css: (c, alpha=null) => {
			return alpha === null ? '#'+c.toString(16) : '#'+c.toString(16)+(Math.round(alpha*255).toString(16))
		},
		rgba_arr_to_css: (arr) => {
			return '#'+arr.map(ap => Math.round(ap*255).toString(16)).join('');
		}
	},
	wudi_selecta_stem_pixels: 50,
	bar_scale: 0.2,
	bar_scale_width: 0.5, //0.25,
	point_scale: 0.025,
	wudi_point_scale: 0.005,
	wudi_UPWthr: 0.4325,
	wudi_DNWthr: -0.3905
}

export {vars}
