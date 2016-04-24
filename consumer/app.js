const process = require('process');
const auth = require('./libs/auth');
const log = require('./libs/log');
const link = require('./libs/link');
const global = require('./libs/global')();
const config = require('./config.json');

let token = auth.getToken();
if (!token){
	log.info('app', '验证失败');
	process.exit(0);
} else {
	global.setToken(token);
	log.info('app', '验证成功');
}

let rs = auth.messageClear(token);
if (rs){
	log.info('app', '消息监听重置成功');
} else {
	log.info('app', '消息监听重置失败');
	process.exit(0);
}

link.start();

