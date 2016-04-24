const net = require('net');
const log = require('./log');
const tools = require('./tools');
const auth = require('./auth');
const global = require('./global')();
const strategy = require('./strategy');
const jrs = require('./jsonrpc/serializer');
const config = require('../config.json');

function handler(conn){
	let data;

	while (data = conn.read()){
		let d = tools.parseMessage(data.toString()), rs, type;
		d.forEach(i=>{
			let item = jrs.deserialize(i).payload;
			switch (item.method){
				case 'fibmscenter_connect':
					type = item.params.clientid.split('-')[0];
					rs = global.authToken(type, item.params.clientid, item.params.token);
					if (rs){
						global.setConn(type, item.params.clientid, conn);
						global.setAddress(type, item.params.clientid, item.params.ip, item.params.port);
					} else {
						log.info('app', `client:${item.params.clientid} auth error`);
					}
					if (type === 'producer' || type === 'queneserver'){
						strategy.allotQueneServer();
					}
					break;
				case 'fibmscenter_healthCheck':
					type = item.params.clientid.split('-')[0];
					rs = global.authToken(type, item.params.clientid, item.params.token);
					if (rs){
						global.setPing(type, item.params.clientid, Date.now() - item.params.startTime);
					} else {
						log.info('app', `client:${item.params.clientid} auth error`);
					}
					break;
			}
		});
	}

	conn.close();
}

function healthCheck(){
	let clientTypes = ['producer', 'consumer', 'queneserver'];
	function check(t){
		let conns = global.getConns(),
			clientids = Object.keys(conns[t]);

		clientids.forEach(clientid=>{
			try{
				conns[t][clientid].write('---fibMS---' + jrs.notification('fibmscenter_healthCheck', {startTime: Date.now()}));
			} catch (e){
				log.info('app', `client:${clientid} log out`);
				delete conns[t][clientid];
				let type = clientid.split('-')[0];
				global.setPing(type, clientid, -1);
				type === 'consumer' && global.clearMessages(clientid);
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

exports.start = function(){
	new net.TcpServer(config.linkServerPort, handler).asyncRun();
	healthCheck();
}
