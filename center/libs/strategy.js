const global = require('./global')();
const jrs = require('./jsonrpc/serializer');
const uuid = require('./jsonrpc/uuid');

exports.allotQueneServer = function(queneserverID){
	let conns = global.getConns(),
		clients = global.getClient(),
		servers = Object.keys(clients.queneserver),
		isReAllot = !!queneserverID;

	servers = servers.filter(s=>{
		if (conns.queneserver[s]){
			return true;
		}
	});
	if (servers.length){
		Object.keys(conns.producer).forEach((producer, idx)=>{
			let i = idx % servers.length,
				s = clients.queneserver[servers[i]];

			if (isReAllot && clients.producer[producer].queneserverID != queneserverID){
				return;
			}
			
			conns.producer[producer].write('---fibMS---' + jrs.request(uuid.v4(), 'fibmscenter_setQueneServer', {
				ip: s.ip,
				port: s.port
			}));
			clients.producer[producer].queneserverID = servers[i];
		});
	}
}