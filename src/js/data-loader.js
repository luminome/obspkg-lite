function do_callback(callback, value){
	if (callback && typeof(callback) === "function") callback(value);
}

async function data_loader(resource_tuples, prog_callback) {
	//console.log("load", prog_callback);
	let container = []
	resource_tuples.forEach(url => {
		if(prog_callback) do_callback(prog_callback, 1);

		let ref = fetch(url[1])
			.then(response => response.json())
			.then(function (data) {
				let obj = {};
				obj[url[0]] = data;
				if(prog_callback) do_callback(prog_callback, -1);
				return obj
			}).catch(function (error) {
				console.log(url, error);
				if(prog_callback) do_callback(prog_callback, -1);
				return error;
			});
		container.push(ref);
	});

  const result = await Promise.all(container);
	let resource_obj = {};
	for (let i of result) {
		let k = Object.keys(i);
		resource_obj[Object.keys(i)] = i[k];
	}
  //console.log("result", rd); // 👉️ 42
  return resource_obj;
}

async function loader(resource_obj_list, prog_callback=null) {

	let container = [];

	resource_obj_list.forEach(obj => {
		if (prog_callback) do_callback(prog_callback, 1);

		let ref = fetch(obj.url)
		.then(response => response.text())
		.then(function (text) {
			if(prog_callback) do_callback(prog_callback, -1);
			return obj.type === 'json' ? JSON.parse(text) : text;
		})
		.catch((error) => {
			console.log(error.status, error);
			return error;
		})
		container.push(ref);
	});

	const done = await Promise.all(container);
	resource_obj_list.forEach((obj,i) => obj.raw = done[i]);
	return resource_obj_list;
}

export {data_loader, loader};
// as default
