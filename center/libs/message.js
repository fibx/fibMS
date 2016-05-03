const db = require('db').openSQLite(__dirname + '/../resources/center-run.db');
const global = require('./global')();
const jrs = require('./jsonrpc/serializer');
const uuid = require('./jsonrpc/uuid');
function addZero(str, length){               
    return new Array(length - str.length + 1).join("0") + str;              
}

function noticeMessageUpdateToQuene(data){
	let conns = global.getConns().queneserver;
	Object.keys(conns).forEach(id=>{
		let content = new Buffer(jrs.notification('fibmscenter_messageRegister'));
		let info = new Buffer(`--fibMS-Length:${addZero(content.length + '', 8)}--`);
		conns[id].write(Buffer.concat([info, content], info.length + content.length));
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