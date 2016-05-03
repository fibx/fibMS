const consumer = require('../sdk/nodejs').Consumer();
const producer = require('../sdk/nodejs').Producer();

let sum = 0;
consumer.onMessage('bra_test', function(params){
	sum+=params.a;
    sum % 1000 === 0 && console.log(sum);
    if (sum === 16666){
        console.log('test ok');
    }
});

var message = producer.createMessage('bra_test');

for (var i = 0; i < 16666; i++){
	message.setParams('a', 1);
	producer.sendMessage(message);
}