/*
Custom Reusable Drag Code
Dan Ellis 2020
*/
import './vendor/modernizr-3.11.2.min';

export function dragControls(canvas, dragAction, object, enabled) {

    let pointer_is_down = false,
        touch_zoomed = false,
        touch_dist = 0,
        pointer_x = 0,
        pointer_y = 0,
        pre_x = 0,
        pre_y = 0,
        reposition = false;


    // function process_touchmove(ev) {
    //   // Set call preventDefault()
    //   ev.preventDefault();
    // }

    // someElement.addEventListener('touchstart', process_touchstart, false);
    // someElement.addEventListener('touchmove', process_touchmove, false);
    // someElement.addEventListener('touchcancel', process_touchcancel, false);
    // someElement.addEventListener('touchend', process_touchend, false);

    //canvas.addEventListener('touchmove', process_touchmove, false);
    ///console.log('mouseevents',canvas,object)

    function get_pointer_distance(e){
      return Math.hypot(
      e.touches[0].pageX - e.touches[1].pageX,
      e.touches[0].pageY - e.touches[1].pageY);
    }

    function pointer_scale(evt) {
       evt.preventDefault();
       dragAction('zoom', 0, evt.deltaY, object);
    }

    function touch_move(evt){
      evt.preventDefault();
      if (evt.touches.length === 2) {
        //zoom
        let new_dist = get_pointer_distance(evt);
        let delta_z = touch_dist-new_dist;
        touch_dist = new_dist;
        touch_zoomed = true;
        dragAction('zoom', 0, delta_z, object);

      }else if (evt.touches.length === 1) {
        //drag
        if(touch_zoomed){
          pointer_x = evt.touches[0].pageX;
          pointer_y = evt.touches[0].pageY;
          touch_zoomed = false;
        }
        let deltaX = evt.touches[0].pageX - pointer_x,
            deltaY = evt.touches[0].pageY - pointer_y;
        pointer_x = evt.touches[0].pageX;
        pointer_y = evt.touches[0].pageY;
        reposition = true;
        dragAction('drag', deltaX, deltaY, object);
      }

    }


    function pointer_move(evt){
			if(canvas.hasOwnProperty('dragControlsEnabled') && !canvas.dragControlsEnabled) return;
      evt.preventDefault();
      if (!pointer_is_down) {
        pointer_x = evt.clientX;
        pointer_y = evt.clientY;
        //reposition = true;
        dragAction('move', pointer_x, pointer_y, object, evt);
        return;
      }

      let deltaX = evt.clientX - pointer_x,
          deltaY = evt.clientY - pointer_y;
      pointer_x = evt.clientX;
      pointer_y = evt.clientY;
      reposition = true;
      dragAction('drag', deltaX, deltaY, object, evt);
    }

    function pointer_down(evt) {
			if(canvas.hasOwnProperty('dragControlsEnabled') && !canvas.dragControlsEnabled) return;
			document.activeElement.blur();
        evt.preventDefault();
        if (evt.touches && evt.touches.length === 2) {
          touch_dist = get_pointer_distance(evt);
        }else if (evt.touches && evt.touches.length === 1) {
          pointer_is_down = true;
          pointer_x = evt.touches[0].pageX;
          pointer_y = evt.touches[0].pageY;
        }else{
          pointer_is_down = true;
          pointer_x = evt.clientX;
          pointer_y = evt.clientY;
        }
        pre_x = pointer_x;
        pre_y = pointer_y;
        reposition = false;
        dragAction(true, pointer_x, pointer_y, object);
    }

    function pointer_up(evt) {
			if(canvas.hasOwnProperty('dragControlsEnabled') && !canvas.dragControlsEnabled) return;
      evt.preventDefault();
      //let deltaX, deltaY;
      let d = 0;
      let deltaX = pointer_x - pre_x,
          deltaY = pointer_y - pre_y;
      d = (Math.abs(deltaX)+Math.abs(deltaY))/2;
      let s = evt.touches ? evt.touches.length : 0
      //alert('touchcancel '+d+' '+s);
      //
      // if (evt.touches && evt.touches.length >= 1) {
      //
      //   alert(["hellos", evt.touches[0].pageX, 'ok'].toString());
      //   let deltaX = evt.touches[0].pageX - pre_x,
      //       deltaY = evt.touches[0].pageY - pre_y;
      //   d = (Math.abs(deltaX)+Math.abs(deltaY))/2;
      //   //alert(["hellos", deltaX, deltaY, 'ok'].toString());
      // }else {
      //   let deltaX = evt.clientX - pre_x,
      //       deltaY = evt.clientY - pre_y;
      //   d = (Math.abs(deltaX)+Math.abs(deltaY))/2;
      //   //alert(["hellos", deltaX, deltaY, 'ok'].toString());
      // }

      pointer_is_down = false;
      let mode = false;  //reposition ? false: 'clicked';

      //deltaX, deltaY);


      if(d < 2.0 && s === 0){
         mode = 'clicked';
      }

      //console.log(evt.target);
      dragAction(mode, pointer_x, pointer_y, object);
    }

		function pointer_cancel(evt) {
			if (canvas.hasOwnProperty('dragControlsEnabled') && !canvas.dragControlsEnabled) return;
			pointer_is_down = false;
			dragAction('cancel', pointer_x, pointer_y, object);
		}
    // function pointer_click(evt) {
    //   evt.preventDefault();
    //   dragAction('click', pointer_x, pointer_y, object);
    // }

    // canvas.addEventListener('mousewheel', pointer_scale, false);
    // canvas.addEventListener('mousemove', pointer_move, false);
    // canvas.addEventListener('mousedown', pointer_down, false);
    // canvas.addEventListener('mouseup', pointer_up, false);

    canvas.addEventListener('mousewheel', pointer_scale, Modernizr.passiveeventlisteners ? {passive: true} : false);
    canvas.addEventListener('mousemove', pointer_move, Modernizr.passiveeventlisteners ? {passive: true} : false);
    canvas.addEventListener('mousedown', pointer_down, Modernizr.passiveeventlisteners ? {passive: true} : false);
    canvas.addEventListener('mouseup', pointer_up, Modernizr.passiveeventlisteners ? {passive: true} : false);
    canvas.addEventListener('mouseleave', pointer_cancel, Modernizr.passiveeventlisteners ? {passive: true} : false);
    //canvas.addEventListener('click', pointer_click, Modernizr.passiveeventlisteners ? {passive: true} : false);

    canvas.addEventListener('touchmove', touch_move, false);
    canvas.addEventListener('touchstart', pointer_down, false);
    //canvas.addEventListener('touchcancel', pointer_up, false);
    canvas.addEventListener('touchend', pointer_up, false);
}



export function dragAction(deltaX, deltaY, object) {
    object.rotation.y += deltaX / 100;
    object.rotation.x += deltaY / 100;
}






























///module.exports = {dragControls:dragControls, dragAction:dragAction}
