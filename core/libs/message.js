const http = require('http');
const tools = require('./tools');
const global = require('./global')();
const quene = require('./quene')();
const config = require('../config.json');

function getMessage(){
	let body = tools.bodyCreate({
		token: global.getToken(),
		clentid: `queneserver-${config.ip}:${config.listenPort}`
	});
	let rs = http.post(config.centerAppServer + '/getMessageRegistered', body, {
		"Content-Type": "application/x-www-form-urlencoded"
	});
	let data = JSON.parse(rs.readAll().toString());
	global.setClient(data.consumerClient);
	return data;
}

exports.register = function(){	
	let {messages, consumerClient} = getMessage();
	quene.setListens(messages);
}