module.exports = {
	bodyCreate(obj){
		let str = '';
		for (let key in obj){
			str += `${key}=${obj[key]}&`;
		}
		return str.substr(0, str.length - 1);
	},
	parseMessage(str){
		return str.split('---fibMS---').filter(function(item){
			return !!item;
		});
	}
}