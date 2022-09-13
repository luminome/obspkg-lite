import {vars} from "./vars-lite";

const out = document.getElementById('obs');
const dom_source = document.getElementById("graph");
const dom_marker = document.getElementById("graph-mark");
const dom_marker_value = document.getElementById("graph-mark-value");
const dom_close = document.getElementById("graph-close");
const dom_title = document.getElementById("graph-title");

let operational_context = null;

const g = {
	selected: null,
	last_selected: null,
    vis: {
        pad:12,
		gutter:{left:32,bottom:24},
        stroke: "#333333",
        stroke_high: "#666666",
		stroke_data: "white",
		mean_color: "#FF00FF",
		bar_up: "#0000AA",
		bar_up_select: "#0000FF",
		bar_down: "#AA0000",
		bar_down_select: "#FF0000",
        font_siz:8
    },
	data_width:null,
	mants: [0.1, 0.25, 0.5, 1.0, 5.0, 20.0, 50.0, 100.0],
	log: (og) => {
		out.innerHTML += '</br>graph:</br>';
		Object.entries(og).map(g => out.innerHTML += g+'</br>');
	},
}

class Bar {
	constructor(n, data, x, y, w, h) {
		this.id = n;
		this.data = data;
		this.color = Math.sign(data) > 0 ? g.vis.bar_up : g.vis.bar_down;
		this.color_select = Math.sign(data) > 0 ? g.vis.bar_up_select : g.vis.bar_down_select;
		this.rect = {x:(x),y:(y),x2:(x+w),y2:(y+h),w:(w),h:(h)};
		//this.rect = {x:parseInt(x),y:parseInt(y),x2:parseInt(x+w),y2:parseInt(y+h),w:parseInt(w),h:parseInt(h)};
		return this;
	}

	draw = (_ctx, select = null) => {
		_ctx.strokeStyle = null;
		_ctx.fillStyle = select ? this.color_select : this.color;
		_ctx.clearRect(this.rect.x, this.rect.y, this.rect.w, this.rect.h);
		_ctx.fillRect(this.rect.x, this.rect.y, this.rect.w, this.rect.h);
		return this;
	}
}

function get_range(m){
	const diff = (m[1]-m[0]);//*2.0;
	let zg = Math.ceil(Math.log(diff));// + 1;

	const gr = zg < 0 ? g.mants[0] : g.mants[zg];


	const hi = m[1] === 0 ? 0.0 : Math.ceil(m[1]/gr)*gr;
	const lo = m[0] === 0 ? 0.0 : Math.ceil(Math.abs(m[0])*10)/-10;
	const range = Math.ceil((hi-lo)/gr);

	g.log({d:diff, g:gr, z:zg, hi:hi, lo:lo});

	const out_range = [];
	for(let c = 0; c <= range; c++){
		const mark = Math.round(((hi)-(c*gr))*1000)/1000;
		out_range.push(mark);
	}
	return {r:out_range, mant:gr};
}

function make_axes_and_grid(_ctx, data){

	const x_range_arr = get_range(data.xlim);
	x_range_arr.r.reverse();
	const y_range_arr = get_range(data.ylim);



	g.data_width = x_range_arr.r[x_range_arr.r.length-1];//data.data[0].length;
	//console.log('x_range_arr', x_range_arr, g.data_width);


    const x_range_inc_px = (g.w-((g.vis.pad)+g.vis.gutter.left))/(x_range_arr.r.length-1);
    const y_range_inc_px = (g.h-((g.vis.pad)+g.vis.gutter.bottom))/(y_range_arr.r.length-1);

	let y_zero = null;
	let tick_mant = 1;

	const x_interval_px = Math.ceil(x_range_inc_px);
	const y_interval_px = Math.ceil(y_range_inc_px);

    for(let xva = 0; xva < x_range_arr.r.length; xva++) {
        const x_off = xva*x_range_inc_px;
        _ctx.strokeStyle = g.vis.stroke;
        _ctx.beginPath();
        _ctx.moveTo(g.vis.gutter.left+x_off, g.vis.pad);
        _ctx.lineTo(g.vis.gutter.left+x_off, g.h - g.vis.gutter.bottom);
        _ctx.stroke();

		const metrics = _ctx.measureText(x_range_arr.r[xva]);
		if(Math.round(metrics.width) >= x_interval_px) tick_mant = 2;

		if(xva % tick_mant === 0){
	        _ctx.font = `${g.vis.font_siz}px heavy_data`;
	        _ctx.textAlign = 'center';
	        _ctx.fillStyle = g.vis.stroke_high;///"#00ff00";//+ (g.vis.font_siz / 2)
	        _ctx.fillText(g.x_range_start+x_range_arr.r[xva], (g.vis.gutter.left+x_off), (g.h-(g.vis.gutter.bottom/2)) + (g.vis.font_siz / 2.0) );
    	}
	}



	tick_mant = 1;
    for(let yva = 0; yva < y_range_arr.r.length; yva++) {

        const y_off = yva*y_range_inc_px;
		if(y_range_arr.r[yva] === 0){
			y_zero = g.vis.pad+y_off;
			_ctx.lineWidth = 2;
			_ctx.strokeStyle = g.vis.stroke_high;
		}else{
			_ctx.lineWidth = 1;
			_ctx.strokeStyle = g.vis.stroke;
		}

        _ctx.beginPath();
        _ctx.moveTo(g.vis.gutter.left, g.vis.pad+y_off);
        _ctx.lineTo(g.w - g.vis.pad, g.vis.pad+y_off);
        _ctx.stroke();

		const m = _ctx.measureText(y_range_arr.r[yva]);
		const ht = (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)*0.8;
		g.log({ht:ht, i:y_interval_px});

		if(ht > y_interval_px) tick_mant = 2;

		if(yva % tick_mant === 0){
	        _ctx.font = `${g.vis.font_siz}px heavy_data`;
	        _ctx.textAlign = 'right';
	        _ctx.fillStyle = g.vis.stroke_high;///"#00ff00";
	        _ctx.fillText(y_range_arr.r[yva], g.vis.gutter.left - (g.vis.font_siz / 2.0), (g.vis.pad + y_off) + (g.vis.font_siz / 2.0) );
		}
    }

    return {
		x0:g.vis.gutter.left,
		y0:y_zero,
		xM:x_range_arr.mant,
		yM:y_range_arr.mant,
		xP:x_range_inc_px,
		yP:y_range_inc_px
	};
}

function plot(_ctx, grid, data){
	_ctx.strokeStyle = g.vis.stroke_data;
	_ctx.lineWidth = 2;
	g.bars_array = [];

	///console.log('plot', data);

	const w_px_inc = Math.floor(g.g_rect.w/data.data[0].length);

	for(let p = 0; p < data.data[0].length; p++) {
        const x = grid.x0 + ((p*grid.xP)/grid.xM);

		const up_y = ((data.data[0][p]*grid.yP)/grid.yM);
		const up_bar = new Bar(p, data.data[0][p], x, grid.y0, w_px_inc, -up_y).draw(_ctx);

		g.bars_array.push(up_bar);

		if(data.mean[1] !== 0){
			const dn_y = ((data.data[1][p]*grid.yP)/grid.yM);
			const dn_bar = new Bar(p, data.data[1][p], x, grid.y0, w_px_inc, -dn_y).draw(_ctx);
			g.bars_array.push(dn_bar);
		}
	}

	if(g.style === 'month'){
		const thr = ['up','down'];
		for(let t of thr){

			const th = (g['wudi_th_'+t]*grid.yP)/grid.yM;


			_ctx.strokeStyle = g.vis['bar_'+t];
			_ctx.lineWidth = 1;
			_ctx.beginPath();
			_ctx.moveTo(grid.x0, grid.y0 - th);
			_ctx.lineTo(g.w-g.vis.pad, grid.y0 - th);
			_ctx.stroke();

			console.log(t, th, _ctx.strokeStyle);

		}
	}
	// const mean_y = (data.mean[0]*grid.yP)/grid.yM;
	// _ctx.strokeStyle = g.vis.mean_color;
	// _ctx.lineWidth = 1;
    // _ctx.beginPath();
    // _ctx.moveTo(grid.x0, grid.y0 - mean_y);
    // _ctx.lineTo(g.w-g.vis.pad, grid.y0 - mean_y);
    // _ctx.stroke();
	//
    // _ctx.font = `${g.vis.font_siz}px heavy_data`;
    // _ctx.textAlign = 'right';
    // _ctx.fillStyle = g.vis.mean_color;
    // _ctx.fillText('mean', g.vis.gutter.left, (grid.y0 - mean_y) + (g.vis.font_siz / 2.0) );

	g.last_selected = null;
	return true;
}

function graph_event(e){
    const u_x = e.pageX - e.currentTarget.parentNode.offsetLeft;
	const u_y = e.pageY - e.currentTarget.parentNode.offsetTop;



	if(u_x > g.g_rect.x && u_x < g.g_rect.x2 && u_y > g.g_rect.y && u_y < g.g_rect.y2){
		dom_marker.style.left = u_x+'px';
		dom_marker_value.style.display = 'block';
		const _ctx = dom_source.getContext( "2d" );

		const interval_px = g.g_rect.w/g.data_width;

		const rx = Math.floor((u_x-g.g_rect.x) / interval_px);
		g.selected = rx;


		if(g.selected !== g.last_selected){
			if(g.last_selected !== null) {
				g.bars_array.filter(b => b.id === g.last_selected).map(b=>{
					b.draw(_ctx);
				});
			}
			g.last_selected = g.selected;
		}


		let kf = '';
		g.bars_array.filter(b => b.id === rx).map(b=>{
			if(b.data) kf += `<div style="color:${b.color_select}">${Math.abs(b.data)}</div>`;
			b.draw(_ctx,'selected');
		})


		dom_marker_value.innerHTML = (g.x_range_start+rx)+kf;
		const dk = dom_marker_value.getBoundingClientRect();
		dom_marker_value.style.top = u_y-(dk.height)+'px';
		dom_marker_value.style.left = u_x-(dk.width/2)+'px';






		// for(let b of g.bars_array){
		// 	if(u_x > b.rect.x && u_x < b.rect.x2){
		// 		dom_marker_value.innerHTML = (b.data);
		// 		const dk = dom_marker_value.getBoundingClientRect();
		// 		dom_marker_value.style.top = u_y-(dk.height)+'px';
		// 		dom_marker_value.style.left = u_x-(dk.width/2)+'px';
		// 		g.selected = b.id;
		// 	}
		// }
		//
		// if(g.selected !== g.last_selected){
		// 	if(g.last_selected !== null) g.bars_array[g.last_selected].draw(_ctx);
		// 	g.last_selected = g.selected;
		// }else{
		// 	if(g.selected !== null) g.bars_array[g.selected].draw(_ctx,'red');
		// }

	}else{
		dom_marker_value.style.display = 'none';
	}


}

function graph(graph_obj, w, h, context){
	operational_context = context;
    g.w = w;
    g.h = h;

	g.g_rect = {
		x:g.vis.gutter.left,
		y:g.vis.pad,
		x2:g.w - g.vis.pad,
		y2:g.h - g.vis.gutter.bottom,
		w:(g.w - g.vis.pad)-g.vis.gutter.left,
		h:(g.h - g.vis.gutter.bottom)-g.vis.pad
	};

	g.vis.bar_up = graph_obj.up_color;
	g.vis.bar_up_select = graph_obj.up_color_select;
	g.vis.bar_down = graph_obj.down_color;
	g.vis.bar_down_select = graph_obj.down_color_select;

	g.x_range_start = graph_obj.x_range_start;
	g.wudi_th_up = graph_obj.wudi_th_up;
	g.wudi_th_down = graph_obj.wudi_th_down;
	g.style = graph_obj.graph_style;

	dom_marker.style.height = g.g_rect.h+'px';
	dom_marker.style.width = '1px';
	dom_marker.style.top = g.g_rect.y+'px';
	dom_marker.style.left = (g.w/2)+'px';

    dom_source.width = g.w;
    dom_source.height = g.h;

	dom_source.parentNode.style.height = g.h+'px';

	dom_title.innerHTML = 'point(s)'+operational_context.points.selected;

    const ctx = dom_source.getContext( "2d", { alpha: false });
    ctx.clearRect( 0, 0, g.w, g.h );
    ctx.fillStyle = 'black';
    ctx.fillRect( 0, 0, g.w, g.h );

    const grid = make_axes_and_grid(ctx, graph_obj);
	plot(ctx, grid, graph_obj);

	dom_source.addEventListener('mousemove', graph_event);

	dom_close.addEventListener('mousedown', operational_context.points_deselect);

}

export {graph}