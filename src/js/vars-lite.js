const vars = {
	user: {
		mouse: {},
		selection: null
	},
	view: {
		width: null,
		height:null
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
