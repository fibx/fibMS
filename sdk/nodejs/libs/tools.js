module.exports = {
	parseMessage(str){
		return parseInt(str.substr(15, 8));
	}
};