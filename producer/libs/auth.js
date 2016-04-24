const http = require('http');
const config = require('../config.json');
const tools = require('./tools');

module.exports = {
	getToken(){
		let clientid = config.producerID,
			secretkey = config.secretKey,
			type = 'producer';
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