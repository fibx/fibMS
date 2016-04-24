const db = require('db').openSQLite(__dirname + '/../resources/center-run.db');

function G(){
	let connPool = {
	 	producer: {},
	 	consumer: {},
		queneserver: {}
	};

	let registeredClient = {
		producer: {},
	 	consumer: {},
		queneserver: {}
	};

	return {
		init(){
			let rs = db.execute('select * from auth');
			rs.forEach((item)=>{
				registeredClient[item.type][item.clientid] = {
					token: item.token,
					ip: '',
					port: -1,
					ping: -1,
					messages: []
				}
			});
		},
		setMessage(data){
			data.forEach((item)=>{
				registeredClient.consumer[`consumer-${item.clientid}`].messages.push(item);
			});
		},
		clearMessages(clientid){
			registeredClient.consumer[clientid].messages = [];
		},
		setToken(type, clientid, token){
			registeredClient[type][clientid].token = token;
		},
		setAddress(type, clientid, ip, port){
			ip && (registeredClient[type][clientid].ip = ip);
			port && (registeredClient[type][clientid].port = port);
		},
		setConn(type, clientid, conn){
			connPool[type][clientid] = conn;
		},
		getConns(){
			return connPool;
		},
		authToken(type, clientid, token){
			return registeredClient[type][clientid].token === token;
		},
		setPing(type, clientid, ping){
			registeredClient[type][clientid] && (registeredClient[type][clientid].ping = ping);	
		},
		getPing(type, clientid){
			return registeredClient[type][clientid].ping + 'ms';
		},
		getClient(type){
			if (type){
				return registeredClient[type];
			} else {
				return registeredClient;
			}
		},
		getRegisteredClient(){
			let rs = {};
			for (let key in  registeredClient.consumer){
				rs[key] = registeredClient.consumer[key].messages;
			}
			return {
				messages: rs,
				consumerClient: registeredClient.consumer
			}
		}
	}
}

let global = null;
module.exports = ()=>{
	global || (global = G());
	return global;
}