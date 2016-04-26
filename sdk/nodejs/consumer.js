'use strict';
const net = require('net');
const jrs = require('./libs/serializer');
const uuid = require('./libs/uuid');
const tools = require('./libs/tools');

let Consumer = function(option){
	option = option || {
		port: 6083
	}
	let that = this;
	this.callbackPool = {
		message: {},
		groupMessage: {},
		requestService: {}
	};
	this.id = uuid.v4();
	this.connected = 'none';

	this.connect = function(cb){
		create(that.connected === false, cb);
		that.connected = 'connecting';
	}

	function create(isReConnect, cb){
		that.client = net.connect(option.port || 6083, function(){
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
			tools.parseMessage(data.toString()).forEach(function(item){
				let rs = jrs.deserialize(item.toString()),
					len = rs.payload.method.length;
				let messageName = rs.payload.method.substr(0, len - 2);	     // ${msgName}_s | ${msgName}_g | ${msgName}_r  
				let type = rs.payload.method.substr(len - 1, 1);	         // payload.method = ${msgName}_${type}
				switch (type) {
					case 'r':
						if (callbackPool.requestService[messageName]){		 // cb(params, successFunc, errorFunc)
							callbackPool.requestService[messageName](rs.payload.params, function(result){	 
								send.call(that, jrs.success(rs.payload.id, result));
							}, function(result){
								send.call(that, jrs.error(rs.payload.id, result));
							});
						}
						break;
					case 's':
						callbackPool.message[messageName] && callbackPool.message[messageName](rs.payload.params);
						break;
					case 'g':
						callbackPool.groupMessage[messageName] && callbackPool.groupMessage[messageName].forEach(function(func){
							func(rs.payload.params);
						});
						break;
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

Consumer.prototype.onMessage = function(messageName, cb){			
	if (!this.callbackPool.message[messageName]){			//listen just once
		let str = jrs.notification(`listens_${messageName}`, {instanceid: this.id});
		send.call(this, str);
	}					
	this.callbackPool.message[messageName] = cb;	  
};

Consumer.prototype.onGroupMessage = function(messageName, cb){
	let gm = this.callbackPool.groupMessage[messageName];	
	if (!gm){											//listen just once
		let str = jrs.notification(`listeng_${messageName}`, {instanceid: this.id});
		send.call(this, str);	
	}												  
	gm ? gm.push(cb) : (this.callbackPool.groupMessage[messageName] = [cb]);
};

Consumer.prototype.onRequestService = function(messageName, cb){
	if (!this.callbackPool.requestService[messageName]){		//listen just once
		let str = jrs.notification(`listenr_${messageName}`, {instanceid: this.id});
		send.call(this, str);		
	}
	this.callbackPool.requestService[messageName] = cb;
};

let instance = null;
module.exports = function(option){
	instance = instance || new Consumer(option);
	return instance;
}; 