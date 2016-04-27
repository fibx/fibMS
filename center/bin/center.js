#!/usr/bin/env fibjs

const process = require('process');
const auth = require('../libs/auth');

;(function(){

	let notics = 
	'\nfibMS 管理中心\n\n' + 
	'addP  <producerID>                     注册Producer\n' + 
	'addC  <consumerID>                     注册Consumer\n' + 
	'addQ  <queneServerAddress> <port>      注册队列服务器\n' + 
	'rm    <clientID>                       删除注册的端\n' + 
	'list                                   查看注册情况';

	let argvs = process.argv.slice(2);
	if ((!argvs.length || !argvs[1]) && !~['list'].indexOf(argvs[0])){
		return console.log(notics);
	}
	switch (argvs[0]) {
		case 'addP':
			auth.addProducer(argvs[1]);
			break;
		case 'addC':	
			auth.addConsumer(argvs[1]);		
			break;
		case 'addQ':
			if (!argvs[2]){
				return console.log(notics);
			}
			auth.addQueneServer(argvs[1], argvs[2]);
			break;
		case 'list':
			auth.listRegisterStatus();
			break;
		case 'rm':
			auth.rmRegisterClient(argvs[1]);
			break;
	}
})();