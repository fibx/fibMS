const net = require('net');
const log = require('./log');
const tools = require('./tools');
const auth = require('./auth');
const message = require('./message');
const global = require('./global')();
const strategy = require('./strategy');
const jrs = require('./jsonrpc/serializer');
const config = require('../config.json');
function addZero(str, length){               
    return new Array(length - str.length + 1).join("0") + str;              
}

function handler(conn){
	let data, connType, connID;

	while (data = conn.read(25)){
		let len = tools.parseMessage(data.toString()), rs, type;
		let i = conn.read(len).toString();
		let item = jrs.deserialize(i).payload;
		switch (item.method) {
			case 'fibmscenter_connect':
				type = item.params.clientid.split('-')[0];
				rs = global.authToken(type, item.params.clientid, item.params.token);
				if (rs) {

					connType = type;
					connID = item.params.clientid;

					global.setConn(type, item.params.clientid, conn);
					global.setAddress(type, item.params.clientid, item.params.ip, item.params.port);
				} else {
					log.info('app', `client:${item.params.clientid} auth error`);
				}
				if (type === 'producer' || type === 'queneserver') {
					strategy.allotQueneServer();
				}
				break;
			case 'fibmscenter_healthCheck':
				type = item.params.clientid.split('-')[0];
				rs = global.authToken(type, item.params.clientid, item.params.token);
				if (rs) {
					global.setPing(type, item.params.clientid, Date.now() - item.params.startTime);
				} else {
					log.info('app', `client:${item.params.clientid} auth error`);
				}
				break;
		}
	}

	conn.close();
	afterDisconnect(connType, connID);
}

function healthCheck(){
	let clientTypes = ['producer', 'consumer', 'queneserver'];
	function check(t){
		let conns = global.getConns(),
			clientids = Object.keys(conns[t]);

		clientids.forEach(clientid=>{
			try{
				let content = new Buffer(jrs.notification('fibmscenter_healthCheck', {startTime: Date.now()}));
				let info = new Buffer(`--fibMS-Length:${addZero(content.length + '', 8)}--`);
				conns[t][clientid].write(Buffer.concat([info, content], info.length + content.length));
			} catch (e){
				afterDisconnect(t, clientid);
			}
		});
	}
	function run(){
		clientTypes.forEach(type=>{
			check(type);
		});
	}
	run();
	setInterval(run, config.healthCheckTime);
}

function afterDisconnect(type, clientid){
	log.info('app', `client:${clientid} log out`);
	let conns = global.getConns();
	delete conns[type][clientid];
	global.setPing(type, clientid, -1);
	type === 'producer' && (global.getClient('producer')[clientid].queneserverID = '');
	type === 'consumer' && global.clearMessages(clientid);
	type === 'queneserver' && strategy.allotQueneServer(clientid);
}

exports.start = function(){
	new net.TcpServer(config.linkServerPort, handler).asyncRun();
	healthCheck();
}
