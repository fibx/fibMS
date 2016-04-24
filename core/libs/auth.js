const http = require('http');
const config = require('../config.json');
const tools = require('./tools');

module.exports = {
	getToken(){
		let clientid = `${config.ip}:${config.listenPort}`,
			secretkey = config.secretKey,
			type = 'queneserver';
		let body = tools.bodyCreate({
			clientid,
			secretkey,
			type
		});

		let rs = http.post(config.centerAppServer + '/auth', body, {
			"Content-Type": "application/x-www-form-urlencoded"
		});
		if (rs.status === 200){
			let obj = JSON.parse(rs.body.read().toString());
			if (obj.result){
				return obj.token;
			} else {
				return null;
			}
		} else {
			return null;
		}
	}
};