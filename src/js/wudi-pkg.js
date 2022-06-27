import {data_loader as load} from './data-loader.js'

const wudi = {
	name:'wudi-pkg.js',
	status:'ok',
	get: function(resource_tuple, callback_function, result_callback){
		load(resource_tuple, callback_function).then(result => {
			result_callback(result);
		});
	}
}

export {
	wudi
}