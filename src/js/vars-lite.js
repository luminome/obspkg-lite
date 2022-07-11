const vars = {
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
	materials: {
		mapMarkersMaterial:{
			type: 'MeshBasicMaterial',
			dict: {
				color: 0xFF00FF,
				side: 'DoubleSide',
				transparent: true,
				opacity:1.0
			}
		}
	},
	colors:{
		eco_regions:{
			select: [0x660066, 0xFF00FF]
		},
		wudi:{
			select: [0x660066, 0xFF00FF]
		}
	}

}

export {vars}
