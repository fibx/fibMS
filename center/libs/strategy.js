const global = require('./global')();
const jrs = require('./jsonrpc/serializer');
const uuid = require('./jsonrpc/uuid');

exports.allotQueneServer = function(){
	let conns = global.getConns(),
		clients = global.getClient(),
		servers = Object.keys(clients.queneserver);

	servers = servers.filter(s=>{
		if (conns.queneserver[s]){
			return true;
		}
	});
	if (servers.length){
		Object.keys(conns.producer).forEach((producer, idx)=>{
			let s = clients.queneserver[servers[idx % servers.length]];
			conns.producer[producer].write('---fibMS---' + jrs.request(uuid.v4(), 'fibmscenter_setQueneServer', {
				ip: s.ip,
				port: s.port
			}));
		});
	}
}