'use strict';
const consumer = require('../sdk/nodejs').Consumer();

consumer.onMessage('hello', function(params){
	console.log(params);
});

consumer.onGroupMessage('hellogroup', function(params){
	console.log('group1');
});
consumer.onGroupMessage('hellogroup', function(params){
	console.log('group2');
});

consumer.onRequestService('hellorequest', function(params, successfunc, errorfunc){
	if (params.issuccess){
		successfunc('test');
	} else {
		errorfunc('test');
	}
});

