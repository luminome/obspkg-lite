import {
	PointsMaterial,
	MeshStandardMaterial,
	MeshBasicMaterial,
	LineBasicMaterial,
	CanvasTexture,
	FrontSide,
	DoubleSide,
	AdditiveBlending
} from 'three/build/three.module.js';

import {LineMaterial} from 'three/examples/jsm/lines/LineMaterial.js';



const pointsMaterial = new PointsMaterial({
	//color: 0x0080ff,
	size: 0.3,
	vertexColors: true
});

const auxPointsMaterial = new PointsMaterial({
	color: 0xffffff,
	size: 0.2
});

const auxPointsMaterial2 = new PointsMaterial({
	color: 0xff0000,
	transparent: true,
	opacity: 1.0,
	size: 0.15
});

const auxPointsMaterial3 = new PointsMaterial({
	color: 0xffff00,
	transparent: true,
	opacity: 0.5,
	size: 0.1
});

const auxPointsLineMaterial = new PointsMaterial({
	color: 0xffff00,
	size: 0.4,
	// depthWrite: false,
	// depthTest: false,
});


const mapGuideVerticesMaterial = new PointsMaterial({
	color: 0xFF00FF,
	size: 0.05,
	transparent: true,
	opacity: 1.0
});

const mapPlaneMaterial = new MeshStandardMaterial({
	color: 0xFFFF00,
	side: DoubleSide,
	flatShading: true,
	transparent: true,
	opacity: 0.25
});

const mapMeshMaterial = new MeshBasicMaterial({
	color: 0x006600,
	side: FrontSide,
	transparent: true,
	depthWrite: false,
	depthTest: false,
	opacity: 1
});

const mapGuidesMaterial = new LineBasicMaterial({
	color: 0xFF00FF,
	transparent: true,
	opacity: 1
});

const mapContoursMaterial = new LineBasicMaterial({
	color: 0x6666FF,
	// transparent: true,
	// opacity: 0.8
});
const mapTileLinesMaterial = new LineMaterial({
	color: 0xffffff,
	linewidth: 0.01, // in world units with size attenuation, pixels otherwise
	vertexColors: true,
	dashed: false,
	alphaToCoverage: true,
	worldUnits: true
});
const mapTileFillsMaterial = new MeshBasicMaterial({
	color: 0x333333,
	// transparent: true,
	// opacity: 0.25
});
const mapTilePlacesMaterial = new MeshBasicMaterial({
	color: 0xFFFF00,
	// transparent: true,
	// opacity:0.5
});
const mapTileUrbanAreasMaterial = new MeshBasicMaterial({
	color: 0xFFFF00,
	side: FrontSide,
	blending: AdditiveBlending,
	depthWrite: false,		//blendSrcAlpha: 0,
	depthTest: false,
	transparent: true,
	opacity:0.15
});
const mapTileDepthsMaterial = new PointsMaterial({
	size: 0.2,
	vertexColors: true
});
const mapMarkersMaterial = new MeshBasicMaterial({
	color: 0xFF00FF,
	side: FrontSide,
	transparent: true,
	opacity:1.0
	//wireframe: true,
	// transparent: true,
	// opacity:0.5
});
const mapWindVectorMaterial = new MeshBasicMaterial({
	color: 0x666666,
	side: FrontSide,
	blending: AdditiveBlending,
	depthWrite: false,		//blendSrcAlpha: 0,
	depthTest: false,
	transparent: true,
	opacity:1.0
});


const mapTileRegionsMaterial = new MeshBasicMaterial({
	color: 0x6666FF,
	side: FrontSide,
//alphaTest: 0.25,
	opacity:0.25,
	transparent: true,
	blending: AdditiveBlending,//NormalBlending,//AdditiveBlending, // NormalBlending, //#AdditiveBlending,
	depthWrite: false,		//blendSrcAlpha: 0,
	depthTest: false,
	wireframe: false,
	//depthFunc: AlwaysDepth, //NeverDepth,
});

const mapTempMaterial = new MeshBasicMaterial({
	color: 0xFFFFFF,
	side: FrontSide,
	// alphaTest: 0.75,
	opacity:0.75,
	transparent: true,
	blending: AdditiveBlending,//NormalBlending,//AdditiveBlending, // NormalBlending, //#AdditiveBlending,
	// depthWrite: false,		//blendSrcAlpha: 0,
	// depthTest: false,
	// depthFunc: AlwaysDepth, //NeverDepth,
	//depthMode: NeverDepth
	//wireframe: true,
	// transparent: true,
	// opacity:0.5
});

function createRadial(){
	let c = document.createElement("canvas");
	c.width = c.height = 256;
	let ctx = c.getContext("2d");
	var x = 127;
	var y = 127;
	var radius = 127;
	let grd = ctx.createRadialGradient(x, y, 1, x, y, radius);
	grd.addColorStop(0, "white");
	grd.addColorStop(1, "transparent");
	ctx.fillStyle = grd;
	ctx.fillRect(0, 0, 256, 256);
	return new CanvasTexture(c);
}
let tex = createRadial();
let mapSSTmat = new MeshBasicMaterial({
	map: tex,
	alphaTest: 0.1,
	transparent: true,
	blending: AdditiveBlending, // NormalBlending, //#AdditiveBlending,
	depthWrite: false,		//blendSrcAlpha: 0,
});


const mapWudiDataMaterial = new MeshBasicMaterial({
	color: 0xFFFFFF,
	side: DoubleSide,
	alphaTest: 0.5,
	opacity:0.5,
	transparent: true,
	blending: AdditiveBlending,
	depthWrite: false,
	depthTest: false,
});

const mapWudiDataLineMaterial = new LineBasicMaterial({
	color: 0xFFFFFF,
	opacity:1.0,
	transparent: true,
	blending: AdditiveBlending
});

//export mapPlaneMaterial = mapPlaneMaterial;

export {
	pointsMaterial,
	auxPointsMaterial,
	auxPointsMaterial2,
	auxPointsMaterial3,
	auxPointsLineMaterial,
	mapGuideVerticesMaterial,
	mapPlaneMaterial,
	mapMeshMaterial,
	mapGuidesMaterial,
	mapContoursMaterial,
	mapTileLinesMaterial,
	mapTileFillsMaterial,
	mapTilePlacesMaterial,
	mapTileUrbanAreasMaterial,
	mapTileDepthsMaterial,
	mapMarkersMaterial,
	mapTempMaterial,
	mapSSTmat,
	mapTileRegionsMaterial,
	mapWudiDataMaterial,
	mapWudiDataLineMaterial,
	mapWindVectorMaterial,
}
