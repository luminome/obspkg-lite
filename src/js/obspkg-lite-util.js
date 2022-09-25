const km_deg = 110.948;

function naturalize_on_loop(value, side = false) {
	if (value > 1) return side ? value - 1 : 0;
	if (value < 0) return side ? 1 + value : 1;
	return value;
}

const max_min = (arr) => {
    return {max: Math.max(...arr), min: Math.min(...arr)};
}

const deg_to_km = (v) => (v * km_deg);

const norm_val = (val, mi, ma) => (val - mi) / (ma - mi);


const find_scale = (data, index) => {
    const group = data.reduce((sv, e, i) => {
        if (i > 0 && e[index] !== null) {
            sv[0].push(e[index]);
            sv[1] += e[index];
        }
        return sv;
    }, [[], 0.0]);

    return {
        'max':Math.max(...group[0]),
        'min':Math.min(...group[0]),
        'avg':group[1] / group[0].length
    }
}


const title_case = (str) => {
  return str.toLowerCase().replace(/(^|\s)\S/g, s => s.toUpperCase());
}

/* Randomize array in-place using Durstenfeld shuffle algorithm */
const shuffle_array = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        let temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
    return array;
}

const to_lexical_range = (numbers, type=null) => {
	//http://jsfiddle.net/sandro_paganotti/4zx73csv/1/
	const months_str = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const sorted = numbers.sort(function(a,b){return a-b;});
    const first = sorted.shift();
    return sorted.reduce(function(ranges, num){
        if(num - ranges[0][1] <= 1){
            ranges[0][1] = num;
        } else {
            ranges.unshift([num, num]);
        }
        return ranges;
    },[[first,first]]).map(function(ranges){
		if(ranges[0] === ranges[1]){
			return type ? months_str[ranges[1]-1] : ranges[0].toString();
		}else{
			return type ? ranges.map(r => months_str[r-1]).join('-') : ranges[0]+'-'+ranges[1].toString().substr(2,2);
		}
    }).reverse();
}


export {max_min, deg_to_km, norm_val, title_case, shuffle_array, to_lexical_range, naturalize_on_loop, find_scale};

