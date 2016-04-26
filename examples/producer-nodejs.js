'use strict';
const producer = require('../sdk/nodejs').Producer();

producer.sendMessage('hello', {a: 1});
producer.sendGroupMessage('hellogroup', {b: 2});
producer.requestService('hellorequest', {c:3}, function(data){
	console.log(data);
});


