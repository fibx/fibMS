const quene = require('./quene');

exports.parse = function(sdkMessage){

	let rs = sdkMessage.payload.params,
		t = Date.now();

	if (rs.props.R + rs.props.P + rs.props.D === 0 || rs.props.R < 0 || rs.props.P < 0 || rs.props.D < 0){
		return false;
	}	

	let obj = {
		id: rs.id,
		method: `${rs.type}_${rs.texts}`,
		params: rs.params,
		start: t,
		last: t,
		times: rs.props.R,
		repeat: rs.props.R,
		dealy: rs.props.D,
		period: rs.props.P
	};
	return obj;
}