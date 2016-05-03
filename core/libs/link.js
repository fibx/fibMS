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
function addZero(str, length){               
    return new Array(length - str.length + 1).join("0") + str;              
}

function handler(conn){
	let data;
	while (data = conn.read(25)){
		let len = tools.parseMessage(data.toString()),
			i = conn.read(len).toString();
		quene.addQuene(i, conn);
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

	let content = new Buffer(jrs.request(uuid.v4(), 'fibmscenter_connect', {
		clientid: `queneserver-${config.ip}:${config.listenPort}`,
		token: global.getToken(),
		ip: config.ip,
		port: config.listenPort
	})),
		info = new Buffer(`--fibMS-Length:${addZero(content.length + '', 8)}--`);
	conn.write(Buffer.concat([info, content], info.length + content.length));

	while (data = conn.read(25)) {
		let len = tools.parseMessage(data.toString()),
			i = conn.read(len).toString();
		let item = jrs.deserialize(i).payload;
		switch (item.method) {
			case 'fibmscenter_healthCheck':
				content = new Buffer(jrs.request(uuid.v4(), 'fibmscenter_healthCheck', {
					startTime: item.params.startTime,
					clientid: `queneserver-${config.ip}:${config.listenPort}`,
					token: global.getToken()
				}));
				info = new Buffer(`--fibMS-Length:${addZero(content.length + '', 8)}--`);
				conn.write(Buffer.concat([info, content], info.length + content.length));
				break;
			case 'fibmscenter_messageRegister':
				message.register();
				break;
		}
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