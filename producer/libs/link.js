const net = require('net');
const coroutine = require("coroutine");
const global = require('./global')();
const jrs = require('./jsonrpc/serializer');
const uuid = require('./jsonrpc/uuid');
const tools = require('./tools');
const log = require('./log');
const config = require('../config.json');

let queneserver = {
		conn: null,
		ip: '',
		port: -1
	},
	reconnectTime = 0,
	timeout = null,
	queneReconnectTime = 0,
	queneTimeout = null;
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

function linkQueneServer(){
	try{
		let data;
		if (queneserver.ip && queneserver.port != -1){
			queneserver.conn = net.connect(queneserver.ip, queneserver.port);
			queneReconnectTime = 0;
			while (data = queneserver.conn.read()){

			}
			queneserver.conn.close();
			queneserver.conn = null;
		}
		function reconnect(){
			if (queneTimeout){
				queneTimeout.clear();
				clearTimeout(queneTimeout);
			}
			queneReconnectTime = queneReconnectTime + RECONNECT_TIME > MAX_RECONNECT_TIME ? MAX_RECONNECT_TIME : queneReconnectTime + RECONNECT_TIME;
			timeout = setTimeout(()=>{
				let fib = coroutine.start(linkQueneServer);
				fib.isReconnect = true;
				fib.join();
				queneserver.conn === null && reconnect();	
			}, queneReconnectTime);
		}
		if (!this.isReconnect){
			reconnect();
		}
	} catch (e){
		log.info('link', 'link queneserver error');
	}
}

function linkCenter(){
	let arr = config.centerLinkServer.split(':'),
		host = arr[0],
		port = parseInt(arr[1]),
		data;

	let conn = net.connect(host, port);
	reconnectTime = 0;
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
							conn: null,
							ip,
							port
						};
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
		coroutine.start(linkQueneServer);
		new net.TcpServer(config.sdkPort, sdkHandler).run();
	}
}