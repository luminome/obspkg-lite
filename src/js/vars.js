import * as THREE from 'three/build/three.module.js';

const vars = {
	key_motion_flag: null,
	nav_bar_offset: 64.0,
	auxillary: 7,
	intersect_instance_wudi: null,
	update_frequency: 30,
	update_pause: false,
	base_url: './data/med_mini_halfdeg_feb_2/',
	abstract: true,
	curve_segments: 18, ///should be multiple of 3
	clicks: 0,
	env_color: 0x111133,
	show_lines: true,
	show_tiles: true,
	show_grid_points: true,
	show_tile_planes: true,
	show_tile_fills: true,
	show_tile_lines: true,
	show_tile_places: true,
	show_tile_depths: true,
	grid_size: 18,
	grid_divisions: 18,
	view_flip: false,
	view_to_threshold: true,
	threshold_size: 12,
	traversal_rate: 1,
	map_data_spec: './datasets/indices/data-map-spec-test.json',
	map_data_paths_whole: './datasets/indices/data-guides-test.json',
	map_data_tile_index: './datasets/indices/data-index-aggregated-test.json',
	map_data_tile_base: (zoom_level, tile_number) => './datasets/tiles/zoom-' + zoom_level + '/data-tile-' + tile_number + '-test.json',
	map_data_tile_depth_base: (zoom_level, tile_number) => './datasets/data/depths/zoom-' + zoom_level + '/data-tile-' + tile_number + '-test.json',
	map_data_tile_urban_base: (tile_number) => './datasets/data/urban/data-tile-' + tile_number + '-test.json',
	map: {
		rect: {
			min_X: null,
			min_Y: null,
			max_X: null,
			max_Y: null
		},
		c: null,
		w: 0,
		h: 0,
		x_off: 0,
		y_off: 0,
		s: 10.0
	},
	view: {
		base_pos: 40.0,
		zoom_limits: {'1': 1.0, '2': 0.8, '3': 0.6, '4': 0.4, '5': 0.2},
		//zoom_limits: {'1': 1.0, '2': 0.5, '3': 0.25, '4': 0.125, '5': 0.0625},
		//zoom_limits: {'1': 1.0, '2': 0.3, '3': 0.15, '4': 0.075, '5': 0.03625},
		get_zoom: function (z) {
			let ast = Object.entries(this.zoom_limits).filter(a => a[1] >= z);
			if (ast.length) {
				return ast[ast.length - 1][0];
			} else {
				return 1;
			}
		},
		nav_bar_offset: null, //24,
		width: null,//window.innerWidth,
		height: null,//window.innerHeight - 24,
		
		reset: function () {
			// this.width = window.innerWidth;
			// this.height = window.innerHeight - this.nav_bar_offset;
			this.reset_callback();
		}
	},
	tile_selection: {
		active: 0,
		previous: 0
	},
	user: {
		zoom: null,
		zoom_level: null,
		position: new THREE.Vector3(),
		soft_position: new THREE.Vector3(),
		guide_position_scalar: 0,
		guide_position_origin_scalar: 0,
		pointer_position: new THREE.Vector3(),
		local_position: new THREE.Vector3(),
		ground_position: new THREE.Vector3(),
		touching_guide: null,
		selected_guide: null,
		mouse: {
			x: 0.0,
			y: 0.0,
			z: 0.0,
			state: false,
			pressed: false,
			clicked: false
		}
	},
	data: {}
}

export {vars}
