const net = require('net');
const coroutine = require("coroutine");
const jrs = require('./jsonrpc/serializer');
const uuid = require('./jsonrpc/uuid');
const message = require('./message');
const tools = require('./tools');
const global = require('./global')();
const quene = require('./quene')();
const log = require('./log');
const config = require('../config.json');

let reconnectTime = 0,
	timeout = null;
const RECONNECT_TIME = 1000;
const MAX_RECONNECT_TIME = 10000;

function handler(conn){
	let data;
	while (data = conn.read()){
		let d = tools.parseMessage(data.toString());
		d.forEach(i=>{
			quene.addQuene(i, conn);
		});
	}

	conn.close();
}

function linkCenter(){
	let arr = config.centerLinkServer.split(':'),
		host = arr[0],
		port = parseInt(arr[1]),
		data,
		conn;

	try{
		conn = net.connect(host, port);
		reconnectTime = 0;
	} catch (e){
		log.info('link', 'link center error');
		return;
	}

	conn.write('---fibMS---' + jrs.request(uuid.v4(), 'fibmscenter_connect', {
		clientid: `queneserver-${config.ip}:${config.listenPort}`,
		token: global.getToken(),
		ip: config.ip,
		port: config.listenPort
	}));
	while (data = conn.read()){
		let d = tools.parseMessage(data.toString());
		d.forEach(i=>{
			let item = jrs.deserialize(i).payload;
			switch (item.method){
				case 'fibmscenter_healthCheck':
					conn.write('---fibMS---' + jrs.request(uuid.v4(), 'fibmscenter_healthCheck', {
						startTime: item.params.startTime,
						clientid: `queneserver-${config.ip}:${config.listenPort}`,
						token: global.getToken()
					}));
					break;
				case 'fibmscenter_messageRegister':
					message.register();
					break;
			}
		});
	}
	conn.close();

	function reconnect(){
		if (timeout){
			timeout.clear();
			clearTimeout(timeout);
		}
		reconnectTime = reconnectTime + RECONNECT_TIME > MAX_RECONNECT_TIME ? MAX_RECONNECT_TIME : reconnectTime + RECONNECT_TIME;
		timeout = setTimeout(()=>{
			let fib = coroutine.start(linkCenter);
			fib.isReconnect = true;
			fib.join();
			reconnect();	
		}, reconnectTime);
	}
	if (!this.isReconnect){
		reconnect();
	}
}

exports.start = function(){
	message.register();
	coroutine.start(linkCenter);
	new net.TcpServer(config.listenPort, handler).run();
}