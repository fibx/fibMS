exports.parse = function(sdkMessage){

	let rs = sdkMessage.payload.params;
	let obj = {
		id: rs.id,
		method: `${rs.type}_${rs.texts}`,
		params: rs.params
	};

	return obj;
}