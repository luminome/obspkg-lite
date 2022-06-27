const main_menu = {
	root:{
		name:'menu',
		type:'static',
		default:true
	},
	data:{
		name:'data layers',
		type:'static',
		default:true
	},
	base:{
		name:'map layers',
		type:'static',
		default:false
	},
	func:{
		name:'controls (options)',
		type:'static',
		default:false
	},
	conf:{
		name:'config',
		type:'static',
		default:false
	},

	places: {
		key: '7',
		key_v: '7',
		name: 'cities/towns',
		default: false,
		type: 'dynamic'
	},
	urban: {
		key: '8',
		key_v: '8',
		name: 'urban density',
		default: false,
		type: 'dynamic'
	},
	protected_regions: {
		key: 'p',
		key_v: 'p',
		name: 'protected areas',
		default: false,
		type: 'dynamic'
	},
	depth_points: {
		key: '9',
		key_v: '9',
		name: 'depth points',
		default: false,
		type: 'dynamic'
	},
	contours: {
		key: '0',
		key_v: '0',
		name: 'depth contours',
		default: true,
		type: 'dynamic'
	},
	sst: {
		key: '+',
		key_v: '+',
		name: 'surface sea temps.',
		default: false,
		type: 'dynamic',
		custom: true
	},
	wind: {
		key: '-',
		key_v: '-',
		name: 'surface wind',
		default: false,
		type: 'dynamic',
		custom: true
	},
	wudi: {
		key: 'w',
		key_v: 'w',
		name: 'WUDI',
		default: true,
		type: 'dynamic',
		custom: true
	},
	guides: {
		key: '1',
		key_v: '1',
		name: 'camera guide(s)',
		default: false,
		type: 'dynamic',
		custom: true
	},
	sectors: {
		key: '2',
		key_v: '2',
		name: 'sectors',
		default: true,
		type: 'static',
		custom: true
	},
	grid: {
		key: '3',
		key_v: '3',
		name: 'sector origins',
		default: false,
		type: 'static',
		custom: true
	},
	planes: {
		key: '4',
		key_v: '4',
		name: 'sector geometry',
		default: false,
		type: 'static',
		custom: true
	},
	fills: {
		key: '5',
		key_v: '5',
		name: 'land shapes',
		default: true,
		type: 'static'
	},
	lines: {
		key: '6',
		key_v: '6',
		name: 'land outlines',
		default: false,
		type: 'static'
	},
	particles: {
		key: 'p',
		key_v: 'p',
		name: 'particles',
		default: false,
		type: 'static',
		custom: true
	},
	arrows: {
		key: 'r',
		key_v: 'r',
		name: 'direction arrows',
		default: false,
		type: 'static',
		custom: true
	},
	map_grid: {
		key: 'g',
		key_v: 'g',
		name: 'grid',
		default: true,
		type: 'static',
		custom: true
	},
	nav_bar: {
		key: 'n',
		key_v: 'n',
		name: 'navigation',
		default: false,
		type: 'static',
		custom: true
	},
	abstract: {
		key: ' ',
		key_v: 'spc',
		name: 'snap view',
		default: true,
		type: 'static',
		custom: true
	},
	view_flip: {
		name: 'change vantage',
		default: false,
		type: 'static',
		custom: 'vars_bool'
	},
	view_to_threshold: {
		name: 'follow coast',
		default: true,
		type: 'static',
		custom: 'vars_bool'
	},
	threshold_size: {
		name: 'tangent spread',
		default: true,
		is_variable: "12",
		units:'km',
		type: 'static',
		custom: 'vars_number'
	},
	traversal_rate: {
		name: 'move distance',
		default: true,
		is_variable: "1",
		units:'km',
		type: 'static',
		custom: 'vars_number'
	},
	update_frequency: {
		name: 'update frequency',
		default: true,
		is_variable: "100",
		units:'ms',
		type: 'static',
		custom: 'vars_number'
	},
}



const pk = {
	root:{
		data:{
			sst:{},
			wind:{},
			wudi:{}
		},
		base:{
			fills:{},
			lines:{},
			places:{},
			urban:{},
			protected_regions:{},
			depth_points:{},
			contours:{},
			particles:{}
		},
		func:{
			abstract:{},
			view_flip: {},
			view_to_threshold: {},
			threshold_size:{},
			traversal_rate: {},
			update_frequency: {}
		},
		conf:{
			arrows:{},
			guides:{},
			sectors:{},
			grid:{},
			planes:{},
			map_grid:{},
			nav_bar:{}
		}
	}
}

const filters = {
	protected_regions:{
		"NAME": "name",
		"STATUS_YR": "year",
		"REP_AREA": "area[km^2]",
		"SITE_TYPE_ENG": "type",
		"IUCN_CAT_ENG": "category",
		"WEBSITE": "web",
		"COUNTRY": "country",
		"MED_REGION": "region"
	},
	places:{
		"name": "name",
    "population": "population",
    "class": "type",
    "tz": "timezone",
    "country": "country",
    "locale": "region"
	}
}


export { main_menu, pk, filters}
