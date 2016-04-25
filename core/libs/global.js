const net = require('net');

function G(){
	let token = '',
		consumerClient = {},
		consumerConn = {};
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
				if (!d.ip || d.ping === -1) continue;
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