'use strict';
const Producer = require('../sdk/nodejs').Producer();

let message = Producer.createMessage('hello');
message.setParams('hello', 'yes');
Producer.sendMessage(message);


message = Producer.createMessage('hellogroup');
message.setType(Producer.MESSAGE_GROUP);
message.setParams('hellogroup', 'yes');
Producer.sendMessage(message);

