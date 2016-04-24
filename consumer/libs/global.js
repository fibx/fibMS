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
			listens[name] ? listens[name].push(instanceid) : (listens[name] = [instanceid]);
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