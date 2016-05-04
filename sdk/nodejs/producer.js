'use strict';
const net = require('net');
const jrs = require('./libs/serializer');
const uuid = require('./libs/uuid');
const tools = require('./libs/tools');

let Message = function(texts){
	this.texts = Array.isArray(texts) ? texts : typeof texts === 'string' ? [texts] : [];
	this.type = Producer.prototype.MESSAGE_NORMAL;
	this.props = {
		D: 0,
		P: 0,
		R: 1
	};
	this.params = {};
	this.callback = null;
}

Message.prototype.setProperty = function(property, value){
	this.props[property] = value;
}

Message.prototype.setParams = function(key, value){
	if (typeof key === 'string'){
		this.params[key] = value;
	}
}

Message.prototype.setType = function(type){
	this.type = type;
}

Message.prototype.addCallBack = function(func){
	this.callback = func;
}

let Producer = function(option){
	option = option || {
		port: 6082
	}
	let that = this;
	this.id = uuid.v4();
	this.dataPack = {
		data: Buffer(0),
		limit: 25,
		waitHead: true
	};
	this.callbackPool = {};
	this.connected = 'none';

	this.connect = function(cb){
		create(that.connected === false, cb);
		that.connected = 'connecting';
	}

	function create(isReConnect, cb){
		that.client = net.connect(option.port || 6082, function(){
			if (isReConnect){
				console.log('Producer inferface reconnect Success');
			} else {
				console.log('Producer inferface connect Success');
			}
			that.connected = true;
			cb && cb();
		});	

		let callbackPool = that.callbackPool;
		that.client.on('data', function(data){
			that.connected = true;
			let lenLeft = that.dataPack.limit - that.dataPack.data.length;
			if (data.length < lenLeft) {
				that.dataPack.data = Buffer.concat([that.dataPack.data, data], that.dataPack.data.length + data.length);
				return;
			} else {
				that.dataPack.data = Buffer.concat([that.dataPack.data, data], that.dataPack.data.length + lenLeft);
			}
			if (that.dataPack.waitHead){
				let contentLength = tools.parseMessage(that.dataPack.data.toString());
				that.dataPack = {
					data: data.slice(lenLeft),
					limit: contentLength,
					waitHead: false
				}
			} else {
				let rs = jrs.deserialize(that.dataPack.data.toString());
				if (rs.type === 'success') {
					let cb = callbackPool[rs.payload.id];
					cb && cb.success && cb.success(rs.payload.result || null);
				} else if (rs.type === 'error') {
					let cb = callbackPool[rs.payload.id];
					cb && cb.error && cb.error(rs.payload.error || null);
				}
			}
		});

		that.client.on('error', function(err){
			console.log(err);
		});

		that.client.on('close', function(){
			that.connected = false;
			that.connect();
		});
	}
	this.connect();
}

function addZero(str, length){               
    return new Array(length - str.length + 1).join("0") + str;              
}

function writeToClient(bufs, client){
	let len = 0, start = 0;
	bufs.forEach(function (b){
		len += b.length;
	});
	let buf = Buffer.concat(bufs, len);
	client.write(buf);
}

function send(str){
	let that = this;
	if (this.connected === 'connecting'){
		return setTimeout(function(){
			send.call(that, str);
		}, 0);
	}
	let content = new Buffer(str),
		info = new Buffer(`--fibMS-Length:${addZero(content.length + '', 8)}--`);
	if (this.connected === true){
		writeToClient([info, content], this.client);
	} else {
		this.connect(function(){
			writeToClient([info, content], that.client);
		});
	}
}

Producer.prototype.createMessage = function(texts){
	return new Message(texts);
};

Producer.prototype.sendMessage = function(message){
	
	if (!message.texts.length){
		return;
	}

	let obj = {
		type: message.type,
		props: message.props,
		texts: message.texts,
		params: message.params,
		id: uuid.v4()
	}

	obj.type === 'RE' && message.callback && (this.callbackPool[obj.id] = message.callback);

	let str = jrs.notification('sendMessage', obj);
	send.call(this, str);
};

Producer.prototype.SCHEDULED_DEALY = 'D';
Producer.prototype.SCHEDULED_PERIOD = 'P';
Producer.prototype.SCHEDULED_REPEAT = 'R';

Producer.prototype.MESSAGE_GROUP = 'GR';
Producer.prototype.MESSAGE_NORMAL = 'SI';
Producer.prototype.MESSAGE_REQUEST = 'RE';

let instance = null;
module.exports = function(option){
	instance = instance || new Producer(option);
	return instance;
}; 