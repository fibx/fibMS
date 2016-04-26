const coroutine = require("coroutine");
const jrs = require('./jsonrpc/serializer');
const uuid = require('./jsonrpc/uuid');
const global = require('./global')();

function Q(){
	let listens = null;
	let quenes = [];

	function route(data){
		let rs = jrs.deserialize(data).payload,
			method = rs.method,
			params = rs.params,
			map = {
				'r': 'request',
				's': 'single',
				'g': 'group'
			};
		let message = method.substr(8),
			type = method.substr(6, 1);

		if (type === 't'){
			type = 'r';
		}

		let clientids = listens[`${map[type]}-${message}`];
		if (clientids){
			if (type === 'r' || type === 's'){
				clientids = [clientids[parseInt(Math.random()*10) % clientids.length]];
			}
			return {
				clientids,
				message: `${message}_${type}`,
				params,
				type
			}
		} 
	}

	return {
		start(){
			function quene(){
				while (true){
					if (listens && quenes.length){
						let rs = route(quenes.shift());
						if (rs){
							let {clientids, message, params} = rs;
							let conns = global.getClient().consumerConn;
							clientids.forEach(clientid=>{
								if (conns[clientid]){
									conns[clientid].write('---fibMS---' + jrs.request(uuid.v4(), message, params));
								}
							});
						}
					}
					coroutine.sleep(1000);
				}
			}
			coroutine.start(quene);
		},
		setListens(value){
			if (!listens){
				listens = {};
			}
			for (let client in value){
				value[client].forEach(item=>{
					let l = listens[`${item.type}-${item.message}`];
					if (l){
						!~l.indexOf(client) && listens[`${item.type}-${item.message}`].push(client);
					} else {
						listens[`${item.type}-${item.message}`] = [client];
					}
				});
			}
		},
		addQuene(obj){
			quenes.push(obj);
		}
	}
}

let quene = null;
module.exports = ()=>{
	quene || (quene = Q());
	return quene;
}