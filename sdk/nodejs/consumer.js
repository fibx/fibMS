'use strict';
const net = require('net');
const jrs = require('./libs/serializer');
const uuid = require('./libs/uuid');
const tools = require('./libs/tools');
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
	this.dataPack = {
		data: Buffer(0),
		limit: 25,
		waitHead: true
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
				console.log('Consumer inferface reconnect Success');
			} else {
				console.log('Consumer inferface connect Success');
			}
			that.connected = true;
			cb && cb();
		});	
		that.client.setKeepAlive(true);

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
				let rs = jrs.deserialize(that.dataPack.data.toString()),
					len = rs.payload.method.length;
				let messageName = rs.payload.method.substr(0, len - 3); // ${msgName}_SI | ${msgName}_GR | ${msgName}_RE 
				let type = rs.payload.method.substr(len - 2, 2); // payload.method = ${msgName}_${type}
				switch (type) {
					case 'RE':
						if (callbackPool.requestService[messageName]) { // cb(params, successFunc, errorFunc)
							callbackPool.requestService[messageName](rs.payload.params, function(result) {
								send.call(that, jrs.success(rs.payload.id, result));
							}, function(result) {
								let data = Array.prototype.slice.call(arguments);
								data.splice(0, 1);
								send.call(that, jrs.error(rs.payload.id, new jrs.err.JsonRpcError(result, data)));
							});
						}
						break;
					case 'SI':
						callbackPool.message[messageName] && callbackPool.message[messageName](rs.payload.params);
						break;
					case 'GR':
						callbackPool.groupMessage[messageName] && callbackPool.groupMessage[messageName].forEach(function(func) {
							func(rs.payload.params);
						});
						break;
				}
				that.dataPack = {
					data: data.slice(lenLeft),
					limit: 25,
					waitHead: true
				};
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

function send(str){
	let that = this;
	if (this.connected === 'connecting'){
		return setTimeout(function(){
			send.call(that, str);
		}, 0);
	}
	if (this.connected === true){
		let content = new Buffer(str),
			info = new Buffer(`--fibMS-Length:${addZero(content.length + '', 8)}--`);
		writeToClient([info, content], that.client);
	} else {
		this.connect(function(){
			writeToClient([info, content], that.client);
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