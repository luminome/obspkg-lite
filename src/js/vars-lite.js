const vars = {
	// window_color: 0x0f1621,
	previous_keys: [],
	debug_tool_state: false,
	static_path:'./data',
	grid_visible: false,
	arrow_helper_visible: false,
	position_marks_visible: false,
	sector_draw: true,
	loader_notify_messages: false,
	degree_scale: 2,
	degree_scale_str: 'deg_2',
	depth_max: 5000.0,
	levels:5,
	min_zoom:0.125,
	q_nav:{
		segment_width: 20,
		height:24
	},
	layers:{
		allow:['line_strings'], //, 'contours'] ///, 'contours'] ///'polygons',
	},
	map:{
		test_bounds: [-7.0, 29.0, 37.0, 49.0]
	},
	user: {
		mouse: {},
		selection: null
	},
	view: {
		width: null,
		height:null,
		q_nav_bar_height: 24,
		graph_obj_height: 120,
		bottom_buffer: 12,
		title_bottom_offset: 32,
		map_vertical_deg_offset: 2.0,
		bottom_offset: 70,
		bottom_bar_height: 32,
		x_axis_inset: 10,
		y_axis_inset: 10
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
		contours:{
			type: 'LineBasicMaterial',
			dict: {
				color: 0x000033
			}
		},
		line_strings:{
			type: 'LineBasicMaterial',
			dict: {
				color: 0x666666
			}
		}
	},
	colors:{
		info_bk_opacity: 0.85,
		window: 0x1D2733,
		chart_tick: 0x888888,
		chart_guide: 0x444444,
		dub_selecta: 0xFFFF00,
		eco_regions:{
			select: [0xFFFFFF, 0x000000]
		},
		wudi:{
			select: [0x660066, 0xFF00FF]
		},
		iso_bath:{
			select: [0x444444, 0xFF00FF]
		},
		hex_css: (c, alpha=null) => {
			return alpha === null ? '#'+c.toString(16) : '#'+c.toString(16)+(Math.round(alpha*255).toString(16))
		}
	},
	bar_scale: 0.1,
	bar_scale_width: 0.5, //0.25,
	point_scale: 0.025,
	wudi_point_scale: 0.005,
}

export {vars}
