const km_deg = 110.948;

const max_min = (arr) => {
    return {max: Math.max(...arr), min: Math.min(...arr)};
}

const deg_to_km = (v) => (v * km_deg);

const norm_val = (val, mi, ma) => (val - mi) / (ma - mi);

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

export {max_min, deg_to_km, norm_val, title_case, shuffle_array};

