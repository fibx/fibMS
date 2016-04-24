module.exports = {
	parseMessage(str){
		return str.split('---fibMS---').filter(function(item){
			return !!item;
		});
	}
};