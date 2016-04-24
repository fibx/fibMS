'use strict';
const net = require('net');
const jrs = require('./libs/serializer');
const uuid = require('./libs/uuid');
const tools = require('./libs/tools');

let Producer = function(option){
	option = option || {
		port: 6082
	}
	let that = this;
	this.id = uuid.v4();
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
			tools.parseMessage(data.toString()).forEach(item=>{
				let rs = jrs.deserialize(item);
				if (rs.type === 'success'){
					let cb = callbackPool[rs.payload.id];
					cb && cb.success && cb.success(rs.payload.result || null);
				} else if (rs.type === 'error'){
					let cb = callbackPool[rs.payload.id];
					cb && cb.error && cb.error(rs.payload.result || null);
				}
			});
		});

		that.client.on('close', function(){
			that.connected = false;
			that.connect();
		});
	}
	this.connect();
}

function send(str){
	let that = this;
	if (this.connected === 'connecting'){
		return setTimeout(function(){
			send.call(that, str);
		}, 0);
	}
	if (this.connected === true){
		this.client.write('---fibMS---' + str);
	} else {
		this.connect(function(){
			that.client.write('---fibMS---' + str);
		});
	}
}

Producer.prototype.sendMessage = function(messageName, messageParams){
	let str = jrs.notification(`notifys_${messageName}`, messageParams);
	send.call(this, str);
};

Producer.prototype.sendGroupMessage = function(messageName, messageParams){
	let str = jrs.notification(`notifyg_${messageName}`, messageParams);
	send.call(this, str);
};

Producer.prototype.requestService = function(messageName, messageParams, cb){
	let id = uuid.v4();
	let str = jrs.request(id, `request_${messageName}`, messageParams);
	this.callbackPool[id] = cb;
	send.call(this, str);
};

let instance = null;
module.exports = function(option){
	instance = instance || new Producer(option);
	return instance;
}; 