const process = require('process');
const auth = require('./libs/auth');
const log = require('./libs/log');
const global = require('./libs/global')();
const link = require('./libs/link');
const quene = require('./libs/quene');
const config = require('./config.json');

let token = auth.getToken();
if (!token){
	log.info('app', '验证失败');
	process.exit(0);
} else {
	global.setToken(token);
	log.info('app', '验证成功');
}

quene.start();
link.start();

