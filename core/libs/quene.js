const coroutine = require("coroutine");
const jrs = require('./jsonrpc/serializer');
const uuid = require('./jsonrpc/uuid');
const global = require('./global')();
function addZero(str, length){               
    return new Array(length - str.length + 1).join("0") + str;              
}

function Q(){
	let listens = null,
		quenes = [];

	function route(data){
		let rs = data.payload,
			method = rs.method,
			params = rs.params,
			map = {
				'RE': 'request',
				'SI': 'single',
				'GR': 'group'
			};
		let message = method.substr(3),
			type = method.substr(0, 2);

		let clientids = listens[`${map[type]}-${message}`];
		if (clientids){
			if (type === 'RE' || type === 'SI'){
				clientids = [clientids[parseInt(Math.random()*10) % clientids.length]];
			}
			return {
				clientids,
				message: `${message}_${type}`,
				params,
				type,
				id: rs.id
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
							let {clientids, message, params, id} = rs;
							let conns = global.getClient().consumerConn;
							clientids.forEach(clientid=>{
								if (conns[clientid]){
									let content = new Buffer(jrs.request(id, message, params)),
										info = new Buffer(`--fibMS-Length:${addZero(content.length + '', 8)}--`);
									conns[clientid].write(Buffer.concat([info, content], info.length + content.length));
								}
							});
						}
					}
					coroutine.sleep(global.getQueneRate());
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
		addQuene(str, conn){
			let obj = jrs.deserialize(str);
			try{
			if (obj.payload.method.substr(0, 2) === 'RE'){
				global.addRequestProducerRecord(obj.payload.id, conn);
			}
			quenes.push(obj);
			} catch(e){
				console.log(str, obj);
				console.log('--------------');
			}
		}
	}
}

let quene = null;
module.exports = ()=>{
	quene || (quene = Q());
	return quene;
}