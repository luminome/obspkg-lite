const vars = {
	window_color: 0x0f1621,
	static_path:'./data',
	position_marks_visible: false,
	sector_draw: false,
	degree_scale: 2,
	degree_scale_str: 'deg_2',
	depth_max: 5000.0,
	levels:5,
	min_zoom:0.125,
	layers:{
		allow:['line_strings'] ///, 'contours'] ///'polygons',
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
		bottom_offset:60
	},
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
				color: 0x00AA00
			}
		},
		line_strings:{
			type: 'LineBasicMaterial',
			dict: {
				color: 0xEEEEEE
			}
		}
	},
	colors:{
		eco_regions:{
			select: [0x330033, 0x660066]
		},
		wudi:{
			select: [0x660066, 0xFF00FF]
		},
		iso_bath:{
			select: [0x333333, 0xFF00FF]
		}
	},
	bar_scale: 0.5
}

export {vars}
