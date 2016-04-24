const hash = require('hash');
const db = require('db').openSQLite(__dirname + '/../resources/center-run.db');
const global = require('./global')();
const crypto = require('crypto');
const log = require('./log');

function addClient(id, type){
	let key = (new Buffer(id)).concat([crypto.randomBytes(32)]); 
	let secretkey = hash.md5(key).digest().hex();
		
	try{
		db.execute(`insert into auth (clientid, secretkey, token, type, created) values (?, ?, ?, ?, ?)`, id, secretkey, '', type, Date.now());
		console.log('注册成功');
		console.log(`secretkey: ${secretkey}`);
	} catch (e){
		console.error('注册失败');
	}
}	

module.exports = {
	addProducer(producerID){
		addClient('producer-' + producerID, 'producer');
	},
	addConsumer(consumerID){
		addClient('consumer-' + consumerID, 'consumer');
	},
	addQueneServer(serverAddress, port){
		try{
			db.execute(`insert into server (queneserver, status, updated) values (?, ?, ?)`, serverAddress + ':' + port, '', Date.now());
			addClient(`queneserver-${serverAddress}:${port}`, 'queneserver');
		} catch (e){
			console.error('注册失败');
		}
	},
	authClientByToken(token){
		let rs = db.execute('select clientid, type from auth where token=?', token);
		if (rs.length){
			return rs[0];
		} else {
			return false;
		}
	},
	authClient(clientid, secretkey, type){
		clientid = `${type}-${clientid}`;
		let rs = db.execute('select * from auth where clientid=? and secretkey=? and type=?', clientid, secretkey, type);
		let key = (new Buffer(secretkey)).concat([crypto.randomBytes(32)]); 
		let token = hash.md5(key).digest().hex();
		if (rs.length){
			db.execute('update auth set token=? where clientid=?', token, clientid);
			global.setToken(type, clientid, token);
			return token;
		} else {
			return false;
		}
	},
	registerMessage(data){
		let created = Date.now();
		let sql = `insert into message (message, clientid, created, type) values `;
		let params = [];
		data.forEach((item, idx)=>{
			if (idx === 0){
				sql += `(?, ?, ?, ?)`;
			} else {
				sql += `,(?, ?, ?, ?)`;
			}
			params = params.concat([item.message, `consumer-${item.clientid}`, created, item.type]);
		});
		try{
			db.execute(sql, ...params);
			global.setMessage(data);
			return true;
		} catch (e){
			return false;
		}
	},
	messageClear(clientid){
		let sql = `delete from message where clientid=?`;
		try{
			db.execute(sql, clientid);
			global.clearMessages(clientid);
			return true;
		} catch (e){
			throw e
			return false;
		}
	}
};