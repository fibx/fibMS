const process = require('process');
const link = require('./libs/link');
const log = require('./libs/log');
const global = require('./libs/global')();
const quene = require('./libs/quene')();
const auth = require('./libs/auth');

let token = auth.getToken();
if (!token){
	log.info('app', '验证失败');
	process.exit(0);
} else {
	log.info('app', '验证成功');
	global.setToken(token);
}

quene.start();
link.start();
