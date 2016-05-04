'use strict'
const consumer = require('../sdk/nodejs').Consumer();
const producer = require('../sdk/nodejs').Producer();

consumer.onMessage('big_test', function(params){
    console.log('resposne ok');
    if (params.a.length === 65535 * 4 + 3){
        console.log('test ok');
    } else {
        console.log(params.a.length);
    }
});

consumer.onRequestService('big_test', function(params, successFunc){
    successFunc(params.a);
});

var message = producer.createMessage('big_test');

let data = '';
for (let i = 0; i < 65535*2; i++){
    data+='aa';
}
data+='end';
console.log('create data ok');
message.setParams('a', data);
producer.sendMessage(message);

message.setType(producer.MESSAGE_REQUEST);
message.addCallBack({
    success: function(result){
        console.log(result);
    },  
    error: ()=>{

    }
});
producer.sendMessage(message);
