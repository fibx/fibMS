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
	/** command FUNC **/
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
	listRegisterStatus(){
		let rs = db.execute(`select * from auth`);
		if (rs.length){
			rs.forEach(client=>{
				console.log(`${client.clientid}      ${client.secretkey}      ${new Date(parseInt(client.created))}`);
			});
		} else {
			console.error('没有注册的端');
		}
	},
	rmRegisterClient(clientid){
		let type = clientid.split('-')[0];
		if (type === 'producer' || type === 'consumer' || type === 'queneserver'){
			let rs = db.execute(`delete from auth where clientid = ?`, clientid);
			if (type === 'queneserver'){
				db.execute(`delete from server where queneserver = ?`, clientid.substr(clientid.split('-').pop().length - 1))
			} 
			console.log('删除成功')
		} else {
			console.log('没有找到要删除的端');
		}
	},
	/** server FUNC **/
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
	}
};