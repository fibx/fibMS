const net = require('net');
const coroutine = require("coroutine");
const jrs = require('./jsonrpc/serializer');
const tools = require('./tools');
function addZero(str, length){               
    return new Array(length - str.length + 1).join("0") + str;              
}

function G(){
	let token = '',
		consumerClient = {},
		consumerConn = {},
		queneRate = 10,
		requestProducerRecord = {};
	
	function consumerConnListen(conn, clientid){
		let data;
		while (data = conn.read(25)){
			let len = tools.parseMessage(data.toString()),
				item = conn.read(len).toString(),
				rs = jrs.deserialize(item);

			if (rs.type === 'success' || rs.type === 'error'){
				if (requestProducerRecord[rs.payload.id]){
					let content = new Buffer(item),
						info = new Buffer(`--fibMS-Length:${addZero(content.length + '', 8)}--`);
					requestProducerRecord[rs.payload.id].write(Buffer.concat([info, content], info.length + content.length));
					delete requestProducerRecord[rs.payload.id];
				}
			}
		}
		conn.close();
		delete consumerConn[clientid];
		consumerClient[clientid].ip = '';
		consumerClient[clientid].ping = -1;
	}
	return {
		setToken(value){
			token = value;
		},
		getToken(){
			return token;
		},
		setClient(data){
			for (let client in data){
				let d = data[client];
				if (!d.ip) continue;
				consumerClient[client] = {
					token: d.token,
					ip: d.ip,
					port: d.port,
					ping: d.ping
				}
				if (consumerConn[client]){
					return;
				}
				let conn = net.connect(d.ip, d.port);
				coroutine.start(consumerConnListen, conn, client);
				consumerConn[client] = conn;
			}
		},
		getClient(){
			return {
				consumerClient,
				consumerConn
			}
		},
		setQueneRate(rate){
			queneRate = rate;
		},
		getQueneRate(){
			return queneRate;
		},
		addRequestProducerRecord(id, conn){
			requestProducerRecord[id] = conn;
		}
	}
}

let global = null;
module.exports = ()=>{
	global || (global = G());
	return global;
}