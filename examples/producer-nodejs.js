'use strict';
const producer = require('../sdk/nodejs').Producer();

producer.sendMessage('hello', {a: 1});
producer.sendGroupMessage('hello', {b: 2});
producer.requestService('hello', {c:3}, function(data){
	console.log(data);
});


