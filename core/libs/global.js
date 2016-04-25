const net = require('net');
const coroutine = require("coroutine");

function G(){
	let token = '',
		consumerClient = {},
		consumerConn = {};
	
	function consumerConnListen(conn, clientid){
		let data;
		while (data = conn.read()){
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
		}
	}
}

let global = null;
module.exports = ()=>{
	global || (global = G());
	return global;
}