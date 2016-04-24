const path = require('path');
const config = require('../config.json');

if (config.debuglog === false){
	console.add({
	   type: "file",
	   levels: [console.INFO, console.ERROR],
	   path: path.fullpath(config.logsPath) + '/fibMSPRODUCER-',  
	   split: "12m",  
	   count: 128
	});
}

module.exports = {
	info(mod, data){
		console.info(`--${mod}--`);
		console.info(data);
	},
	error(mod, data){
		console.error(`--${mod}--`);
		console.error(data);
	}
}