function G(){
	let token = "";
	return {
		setToken(value){
			token = value;
		},
		getToken(){
			return token;
		}
	}
}

let global = null;
module.exports = ()=>{
	global || (global = G());
	return global;
}