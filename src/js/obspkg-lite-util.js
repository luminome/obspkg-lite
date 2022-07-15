const km_deg = 110.948;

const max_min = (arr) => {
    return {max: Math.max(...arr), min: Math.min(...arr)};
}

const deg_to_km = (v) => (v * km_deg);

const norm_val = (val, mi, ma) => (val - mi) / (ma - mi);

const title_case = (str) => {
  return str.toLowerCase().replace(/(^|\s)\S/g, s => s.toUpperCase()); ///\b\w/g
}

export {max_min, deg_to_km, norm_val, title_case};

