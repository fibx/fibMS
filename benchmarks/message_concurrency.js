const consumer = require('../sdk/nodejs').Consumer();
const producer = require('../sdk/nodejs').Producer();

consumer.onMessage('bra_test', function(params){
	console.log(params);
});

var message = producer.createMessage('bra_test');

for (var i = 0; i < 100000; i++){
	message.setParams('a', i);
	producer.sendMessage(message);
}