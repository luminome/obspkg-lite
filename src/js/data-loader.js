function do_callback(callback, value){
	if (callback && typeof(callback) === "function") callback(value);
}

async function data_loader(resource_tuples, prog_callback) {
	//console.log("load", prog_callback);

	let container = []
	resource_tuples.forEach(url => {
		do_callback(prog_callback, 1);
		let ref = fetch(url[1])
			.then(response => response.json())
			.then(function (data) {
				let obj = {};
				obj[url[0]] = data;
				do_callback(prog_callback, -1);
				return obj
			}).catch(function (error) {
				console.log(url, error);
				do_callback(prog_callback, -1);
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

export {data_loader};
// as default
