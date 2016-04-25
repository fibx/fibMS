const db = require('db').openSQLite(__dirname + '/../resources/center-run.db');
const global = require('./global')();
const jrs = require('./jsonrpc/serializer');
const uuid = require('./jsonrpc/uuid');

function noticeMessageUpdateToQuene(data){
	let conns = global.getConns().queneserver;
	Object.keys(conns).forEach(id=>{
		conns[id].write('---fibMS---' + jrs.notification('fibmscenter_messageRegister'));
	});
}

module.exports = {
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
			noticeMessageUpdateToQuene(data);
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
			return false;
		}
	},
	noticeMessageUpdateToQuene
}