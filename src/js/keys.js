
export function keyControls(root_surface, keyAction) {
  let keyMap = [];

  let keysScope = {
    49:'one',
    50:'two',
    51:'three',
    52:'four',
    53:'five',
    54:'six',
    55:'seven',
    56:'eight',
		57:'nine',
		48:'zero',
    32:'space',
    37:'left-arrow',
    39:'right-arrow',
    38:'up-arrow',
    40:'down-arrow',
    65:'A',
    68:'D',
    87:'W',
    83:'S',
		80:'P',
		// 187:'plus',
		// 189:'minus',
		107:'plus',
		109:'minus'
  }

  // function filter(map){
  //   let pack = [];
  //   for(let k of map) pack.push(keysScope[k]);
  //   return pack;
  // }
	//
  // function key(x){
  //   return (keyMap.includes(x));
  // }

  function update_keys(){
    keyAction(keyMap);
  }

  function key_down(e){
		if(document.activeElement.type === 'text') return;


    if(!keyMap.includes(e.key)){
        keyMap.push(e.key);
    }
    e.preventDefault();
    update_keys();
  }

  function key_up(e){
		if(document.activeElement.type === 'text') return;

    if(keyMap.includes(e.key)){
        keyMap.splice(keyMap.indexOf(e.key), 1);
    }
    e.preventDefault();
    update_keys();
  }

  root_surface.addEventListener('keydown', key_down);
  root_surface.addEventListener('keyup', key_up)

}




