const net = require('net');
const coroutine = require("coroutine");
const global = require('./global')();
const jrs = require('./jsonrpc/serializer');
const uuid = require('./jsonrpc/uuid');
const tools = require('./tools');
const log = require('./log');
const quene = require('./quene');
const message = require('./message');
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
const requestClientRecord = {};
function addZero(str, length){               
    return new Array(length - str.length + 1).join("0") + str;              
}

function sdkHandler(conn){
	let data;
	while (data = conn.read(25)) {
		let len = tools.parseMessage(data.toString()),
			i = conn.read(len).toString(),
			messagebody = jrs.deserialize(i);

		if (messagebody.type === 'notification' && messagebody.payload.method === 'sendMessage'){
			let task = message.parse(messagebody);
			if (messagebody.payload.params.type === 'RE'){
				requestClientRecord[messagebody.payload.params.id] = conn;
			}
			task && quene.addTask(task);
		}
	}
	conn.close();
}

function linkQueneServer(){
	try{
		let data;
		if (queneserver.ip && queneserver.port != -1){
			queneserver.conn = net.connect(queneserver.ip, queneserver.port);
			quene.setQueneServer(queneserver);
			queneReconnectTime = 0;
			while (data = queneserver.conn.read(25)){
				let len = tools.parseMessage(data.toString()),
					i = queneserver.conn.read(len).toString();

				let rs = jrs.deserialize(i);
				if (rs.type === 'success' || rs.type === 'error'){
					if (requestClientRecord[rs.payload.id]){
						let content = new Buffer(i),
							info = new Buffer(`--fibMS-Length:${addZero(content.length + '', 8)}--`);
						requestClientRecord[rs.payload.id].write(Buffer.concat([info, content], info.length + content.length));
						delete requestClientRecord[rs.payload.id];
					}
				}
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
		clientid: `producer-${config.producerID}`, 
		token: global.getToken()
	})),
		info = new Buffer(`--fibMS-Length:${addZero(content.length + '', 8)}--`);
	conn.write(Buffer.concat([info, content], info.length + content.length));

	while (data = conn.read(25)) {
		let len = tools.parseMessage(data.toString()),
			i = conn.read(len).toString();
		let item = jrs.deserialize(i).payload;
		switch (item.method) {
			case 'fibmscenter_healthCheck':

				let contentH = new Buffer(jrs.request(uuid.v4(), 'fibmscenter_healthCheck', {
						startTime: item.params.startTime,
						clientid: `producer-${config.producerID}`,
						token: global.getToken()
					})),
					infoH = new Buffer(`--fibMS-Length:${addZero(contentH.length + '', 8)}--`);
				conn.write(Buffer.concat([infoH, contentH], infoH.length + contentH.length));
				break;
			case 'fibmscenter_setQueneServer':
				let {
					ip, port
				} = item.params;
				if (ip != queneserver.ip || port != queneserver.port) {
					queneserver.conn && queneserver.conn.close();
					queneserver = {
						conn: null,
						ip,
						port
					};
				}
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

module.exports = {
	start(){
		coroutine.start(linkCenter);
		coroutine.start(linkQueneServer);
		new net.TcpServer(config.sdkPort, sdkHandler).run();
	}
}