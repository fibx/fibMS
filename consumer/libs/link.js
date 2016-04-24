const net = require('net');
const coroutine = require("coroutine");
const jrs = require('./jsonrpc/serializer');
const uuid = require('./jsonrpc/uuid');
const log = require('./log');
const tools = require('./tools');
const auth = require('./auth');
const global = require('./global')();
const config = require('../config.json');

let queneserver = null,
	reconnectTime = 0,
	timeout = null;
const RECONNECT_TIME = 1000;
const MAX_RECONNECT_TIME = 10000;

function sdkHandler(conn){
	let data;
	while (data = conn.read()) {
		let listenList = [];
		
		tools.parseMessage(data.toString()).forEach(item=>{
			let rs = jrs.deserialize(item);
			if (rs.type === 'notification'){
				let arr = rs.payload.method.split('_'),
					type = arr.shift(),
					messageName = arr.join('_'),
					map = {
						'listens': 'single',
						'listeng': 'group',
						'listenr': 'request'
					}
				
				let instanceid = rs.payload.params.instanceid;
				global.setSdkConn(instanceid, conn);
				if (global.listenExists(messageName, map[type])){						//message register just once
					return;
				}

				listenList.push({	
					type: map[type],
					message: messageName,
					clientid: config.consumerID,
					instanceid
				});
			}
		});

		if (listenList.length){
		 	let rs = auth.registerMessage(listenList, global.getToken());
		 	if (rs){
		 		listenList.forEach((item)=>{
		 			global.setListens(item.instanceid, item.message, item.type);
		 		});
		 		log.info('app', '消息注册成功');
		 	} else {
		 		log.info('app', '消息注册失败');
		 	}
		}
	}
}

function linkCenter(){
	let arr = config.centerLinkServer.split(':'),
		host = arr[0],
		port = parseInt(arr[1]),
		data;

	let conn = net.connect(host, port);
	conn.write('---fibMS---' + jrs.request(uuid.v4(), 'fibmscenter_connect', {
		clientid: `consumer-${config.consumerID}`,
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
						clientid: `consumer-${config.consumerID}`,
						token: global.getToken()
					}));
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

function listenHandler(conn){
	let data;
	while (data = conn.read()){
		let d = tools.parseMessage(data.toString());
		d.forEach(i=>{
			let item = jrs.deserialize(i).payload,
				type = item.method.substr(item.method.length - 1, 1),
				listens = global.getListens(),
				conns = global.getSdkConns(),
				instanceids = listens[item.method];
			
			if (!instanceids) return;
			if (type === 'r' || type === 's'){
				instanceids = [instanceids[0]];
			} 
			
			instanceids.forEach(i=>{
				conns[i].write('---fibMS---' + jrs.request(uuid.v4(), item.method, item.params));
			});		
		});
	}
}

module.exports = {
	start(){
		coroutine.start(linkCenter);
		new net.TcpServer(config.listenPort, listenHandler).asyncRun();
		new net.TcpServer(config.sdkPort, sdkHandler).run();
	}
}