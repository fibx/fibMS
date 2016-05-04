'use strict'
const consumer = require('../sdk/nodejs').Consumer();
const producer = require('../sdk/nodejs').Producer();

consumer.onMessage('big_test', function(params){
    if (params.a.length === 65535 * 4 + 3){
        console.log('test ok');
    } else {
        console.log(params.a.length);
    }
});

var message = producer.createMessage('big_test');

let data = '';
for (let i = 0; i < 65535*2; i++){
    data+='aa';
}
data+='end';
message.setParams('a', data);
producer.sendMessage(message);
