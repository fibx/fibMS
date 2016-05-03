const global = require('./global')();
const jrs = require('./jsonrpc/serializer');
const uuid = require('./jsonrpc/uuid');
function addZero(str, length){               
    return new Array(length - str.length + 1).join("0") + str;              
}

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
			
			let content = new Buffer(jrs.request(uuid.v4(), 'fibmscenter_setQueneServer', {
				ip: s.ip,
				port: s.port
			}));
			let info = new Buffer(`--fibMS-Length:${addZero(content.length + '', 8)}--`);
			conns.producer[producer].write(Buffer.concat([info, content], info.length + content.length));
			clients.producer[producer].queneserverID = servers[i];
		});
	}
}