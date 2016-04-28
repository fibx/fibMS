'use strict';
const consumer = require('../sdk/nodejs').Consumer();

consumer.onMessage('hello', function(params){
	console.log(params);
});

consumer.onMessage('dealy', function(params){
	console.log(params);
});

consumer.onMessage('period', function(params){
	console.log(params);
});

consumer.onGroupMessage('all', function(params){
	console.log(params);
});

consumer.onGroupMessage('hellogroup', function(params){
	console.log('group1');
});
consumer.onGroupMessage('hellogroup', function(params){
	console.log('group2');
});

consumer.onRequestService('helloRequest', function(params, successfunc, errorfunc){
	console.log('response');
	if (params.name){
		successfunc({a: params.name.a + 1, b: params.name.b + 1});
	} else {
		errorfunc('test error', 'fuck');
	}
});

