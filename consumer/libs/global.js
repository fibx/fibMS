 function G(){
 	let map = {
		'request': 'r',
		'single': 's',
		'group': 'g'
	};
	let token = '';
	let listens = {};
	let sdkConns = {};
	return {
		getToken(){
			return token;
		},
		setToken(value){
			token = value;
		},
		setListens(instanceid, message, type){
			
			let name = `${message}_${map[type]}`;
			if (listens[name]){
				!~listens[name].indexOf(instanceid) && listens[name].push(instanceid);
			} else {
				listens[name] = [instanceid];
			}
		},
		removeListens(instanceid){
			Object.keys(listens).forEach(name=>{
				let idx = listens[name].indexOf(instanceid);
				if (!!~idx){
					listens[name].splice(idx, 1);
				}
			});
		},
		getListens(){
			return listens;
		},
		listenExists(message, type){
			let name = `${message}_${map[type]}`;
			return !!listens[name];
		},
		setSdkConn(instanceid, conn){
			sdkConns[instanceid] = conn;
		},
		getSdkConns(){
			return sdkConns;
		}
	}
}

let global = null;
module.exports = ()=>{
	global || (global = G());
	return global;
}