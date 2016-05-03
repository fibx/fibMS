'use strict';
const Producer = require('../sdk/nodejs').Producer();
let message;
// message = Producer.createMessage('hello');
// message.setParams('hello', 'yes');
// Producer.sendMessage(message);

// message = Producer.createMessage('hellogroup');
// message.setType(Producer.MESSAGE_GROUP);
// message.setParams('hellogroup', 'yes');
// Producer.sendMessage(message);

//综合
message = Producer.createMessage('all');
message.setType(Producer.MESSAGE_GROUP);
message.setProperty(Producer.SCHEDULED_DEALY, 10002);
message.setProperty(Producer.SCHEDULED_PERIOD, 2 * 1000);
message.setProperty(Producer.SCHEDULED_REPEAT, 6);
message.setParams('hello all 董一炜', 'ok');
Producer.sendMessage(message);

//循环消息
message = Producer.createMessage('all');
message.setType(Producer.MESSAGE_GROUP);
message.setProperty(Producer.SCHEDULED_DEALY, 1000);
message.setProperty(Producer.SCHEDULED_PERIOD, 2 * 1000);
message.setProperty(Producer.SCHEDULED_REPEAT, 0);
message.setParams('hello all-----', 'ok');
Producer.sendMessage(message);

//延迟消息
message = Producer.createMessage('dealy');
message.setProperty(Producer.SCHEDULED_DEALY, 10 * 1000);
message.setParams('hello dealy', 'ok');
Producer.sendMessage(message);

//定时消息
message = Producer.createMessage('period');
message.setProperty(Producer.SCHEDULED_PERIOD, 6 * 1000);
message.setProperty(Producer.SCHEDULED_REPEAT, 6);
message.setParams('hello period repeat', 'ok');
Producer.sendMessage(message);

//request-response success
message = Producer.createMessage('helloRequest');
message.setType(Producer.MESSAGE_REQUEST);
message.setParams('name', {a:1, b:2});
message.addCallBack({
	success: function(result){
		console.log(result)
	},
	error: function(){
		console.log('error');
	}
});
Producer.sendMessage(message);

//request-response error
message = Producer.createMessage('helloRequest');
message.setType(Producer.MESSAGE_REQUEST);
message.setParams('nameerror', {a:1, b:2});
message.addCallBack({
	success: function(result){
		console.log(result)
	},
	error: function(result){
		console.log(result);
	}
});
Producer.sendMessage(message);
