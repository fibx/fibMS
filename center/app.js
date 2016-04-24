const fs = require('fs');
const config = require('./config.json');
const app = require('fibjs-fibx')();
const router = require('fibjs-fibx-router')({
	fixSlash: true,
    simulation: true,
    size: 200
});

if (config.debuglog === false){
	let rundb = `${__dirname}/resources/center-run.db`,
		olddb = `${__dirname}/resources/center-${Date.now()}.db`,
		templatedb = `${__dirname}/resources/center.db`;
	if (fs.exists(rundb)){
		fs.open(rundb).copyTo(fs.open(olddb, 'w'));
	}
}

const linkServer = require('./libs/link');
const auth = require('./libs/auth');
const global = require('./libs/global')();
global.init();

router.post('/auth', function(){
	let clientid = this.form['clientid'],
		secretkey = this.form['secretkey'],
		type = this.form['type'];

	if (clientid && secretkey && type){
		let rs = auth.authClient(clientid, secretkey, type);
		if (rs) {
			this.body = {result: 1, token: rs};
		} else {
			this.status = 401;
		}
	} else {
		this.status = 500;
	}
});

router.post('/messageclear', function(){
	let rs = auth.authClientByToken(this.form['token']);
	if (!rs){
		return this.status = 401;
	} else {
		if (auth.messageClear(rs.clientid)){
			this.body = {result: 1};
		} else {
			this.status = 500;
		}
	}
});

router.post('/registermsg', function(){
	if (!auth.authClientByToken(this.form['token'])){
		return this.status = 401;
	}
	let data = JSON.parse(this.form['data']);
	let rs = auth.registerMessage(data);
	if (rs){
		this.body = {result: 1};
	} else {
		this.status = 500;
	}
});

router.post('/getMessageRegistered', function(){
	if (!this.form['clientid'] === auth.authClientByToken(this.form['token']).clientid){
		return this.status = 401;
	}
	this.body = global.getRegisteredClient();
})

app.use('/', router.getAllRoute());
linkServer.start();
app.listen(config.appServerPort);
