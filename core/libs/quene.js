const coroutine = require("coroutine");
const jrs = require('./jsonrpc/serializer');
const global = require('./global')();

function Q(){
	let listens = null;
	let quenes = [];
	return {
		start(){
			function quene(){
				while (true){
					if (listens && quenes.length){
					}
					coroutine.sleep(10);
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
						!~l.indexOf(client) && l.push(client);
					} else {
						l = [client];
					}
				});
			}
		},
		route(data){
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
		},
		addQuene(arr){
			quenes = quenes.concat(arr);
		}
	}
}

let quene = null;
module.exports = ()=>{
	quene || (quene = Q());
	return quene;
}