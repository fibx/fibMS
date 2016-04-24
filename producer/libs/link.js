const net = require('net');
const coroutine = require("coroutine");
const global = require('./global')();
const jrs = require('./jsonrpc/serializer');
const uuid = require('./jsonrpc/uuid');
const tools = require('./tools');
const config = require('../config.json');

let queneserver = {
		conn: null,
		ip: '',
		port: -1
	},
	reconnectTime = 0,
	timeout = null;
const RECONNECT_TIME = 1000;
const MAX_RECONNECT_TIME = 10000;

function sdkHandler(conn){
	let data;
	while (data = conn.read()) {
		let d = tools.parseMessage(data.toString());
		d.forEach(i=>{
			let item = jrs.deserialize(i).payload;
			queneserver.conn && queneserver.conn.write('---fibMS---' + jrs.request(uuid.v4(), item.method, item.params));
		});
	}
	conn.close();
}

function linkCenter(){
	let arr = config.centerLinkServer.split(':'),
		host = arr[0],
		port = parseInt(arr[1]),
		data;

	let conn = net.connect(host, port);
	conn.write('---fibMS---' + jrs.request(uuid.v4(), 'fibmscenter_connect', {
		clientid: `producer-${config.producerID}`, 
		token: global.getToken()
	}));
	while (data = conn.read()){
		let d = tools.parseMessage(data.toString());
		d.forEach(i=>{
			let item = jrs.deserialize(i).payload;
			switch (item.method){
				case 'fibmscenter_healthCheck':
					conn.write('---fibMS---' + jrs.request(uuid.v4(), 'fibmscenter_healthCheck', {
						startTime: item.params.startTime,
						clientid: `producer-${config.producerID}`,
						token: global.getToken()
					}));
					break;
				case 'fibmscenter_setQueneServer':
					let {ip, port} = item.params;
					if (ip != queneserver.ip || port != queneserver.port){
						queneserver.conn && queneserver.conn.close();
						queneserver = {
							conn: net.connect(ip, port),
							ip,
							port
						}
					}
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

module.exports = {
	start(){
		coroutine.start(linkCenter);
		new net.TcpServer(config.sdkPort, sdkHandler).run();
	}
}