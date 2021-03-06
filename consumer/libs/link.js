const net = require('net');
const coroutine = require("coroutine");
const jrs = require('./jsonrpc/serializer');
const uuid = require('./jsonrpc/uuid');
const log = require('./log');
const tools = require('./tools');
const auth = require('./auth');
const global = require('./global')();
const config = require('../config.json');

let requestQueneServerRecord = {},
	reconnectTime = 0,
	timeout = null;
const RECONNECT_TIME = 1000;
const MAX_RECONNECT_TIME = 10000;
function addZero(str, length){               
    return new Array(length - str.length + 1).join("0") + str;              
}

function sdkHandler(conn){
	let data, id;
	while (data = conn.read(25)) {
		let listenList = [],
			len = tools.parseMessage(data.toString()),
			item = conn.read(len).toString();

		let rs = jrs.deserialize(item);
		if (rs.type === 'notification') {
			let arr = rs.payload.method.split('_'),
				type = arr.shift(),
				messageName = arr.join('_'),
				map = {
					'listens': 'single',
					'listeng': 'group',
					'listenr': 'request'
				};

			let instanceid = rs.payload.params.instanceid;
			id = instanceid;
			global.setSdkConn(instanceid, conn);
			if (global.listenExists(messageName, map[type])) {				 //message register just once
				global.setListens(instanceid, messageName, map[type]);
			} else {
				listenList.push({
					type: map[type],
					message: messageName,
					clientid: config.consumerID,
					instanceid
				});
			}
		} else if (rs.type === 'success' || rs.type === 'error') {
			let requestId = rs.payload.id;
			if (requestQueneServerRecord[requestId]) {
				let content = new Buffer(item),
					info = new Buffer(`--fibMS-Length:${addZero(content.length + '', 8)}--`);
				requestQueneServerRecord[requestId].write(Buffer.concat([info, content], info.length + content.length));
				delete requestQueneServerRecord[requestId];
			}
		}

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
	conn.close();

	let conns = global.getSdkConns();
	delete conns[id];
	global.removeListens(id);
}

function linkCenter(){
	let arr = config.centerLinkServer.split(':'),
		host = arr[0],
		port = parseInt(arr[1]),
		conn,
		data;
	try{
		conn = net.connect(host, port);
		reconnectTime = 0;
	} catch (e){
		log.info('link', 'link center error');
		return;
	}

	let content = new Buffer(jrs.request(uuid.v4(), 'fibmscenter_connect', {
		clientid: `consumer-${config.consumerID}`,
		token: global.getToken(),
		ip: config.ip,
		port: config.listenPort
	})),
		info = new Buffer(`--fibMS-Length:${addZero(content.length + '', 8)}--`);
	conn.write(Buffer.concat([info, content], info.length + content.length));

	while (data = conn.read(25)){
		let len = tools.parseMessage(data.toString()),
			i = conn.read(len).toString();
		let item = jrs.deserialize(i).payload;
		switch (item.method) {
			case 'fibmscenter_healthCheck':
				content = new Buffer(jrs.request(uuid.v4(), 'fibmscenter_healthCheck', {
					startTime: item.params.startTime,
					clientid: `consumer-${config.consumerID}`,
					token: global.getToken()
				}));
				info = new Buffer(`--fibMS-Length:${addZero(content.length + '', 8)}--`);
				conn.write(Buffer.concat([info, content], info.length + content.length));
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

function listenHandler(conn){
	let data;
	while (data = conn.read(25)){
		let len = tools.parseMessage(data.toString());
		let item = jrs.deserialize(conn.read(len).toString()).payload,
			type = item.method.substr(item.method.length - 2, 2),
			id = item.id,
			listens = global.getListens(),
			conns = global.getSdkConns(),
			instanceids = listens[item.method].filter(i => {
				return !!conns[i];
			});
		if (!instanceids) return;
		if (type === 'RE' || type === 'SI') {
			instanceids = [instanceids[0]];
		}
		type === 'RE' && (requestQueneServerRecord[id] = conn);
		instanceids.forEach(i => {
			let content = new Buffer(jrs.request(id, item.method, item.params)),
				info = new Buffer(`--fibMS-Length:${addZero(content.length + '', 8)}--`);
			conns[i] && conns[i].write(Buffer.concat([info, content], info.length + content.length));
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