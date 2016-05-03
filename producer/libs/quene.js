const coroutine = require("coroutine");
const jrs = require('./jsonrpc/serializer');

//{times,dealy,period}
let tasks = [];
let queneserver = null;
function addZero(str, length){               
    return new Array(length - str.length + 1).join("0") + str;              
}

function quene() {
	while (true) {
		let time = Date.now();
		tasks = tasks.filter(task => {
			if ((task.start === task.last && task.dealy && time - task.start < task.dealy) ||
				(task.start !== task.last && task.period && time - task.last < task.period)) {
				return true;
			}
			let content = new Buffer(jrs.request(task.id, task.method, task.params)),
				info = new Buffer(`--fibMS-Length:${addZero(content.length + '', 8)}--`);

			queneserver && queneserver.conn && queneserver.conn.write(Buffer.concat([info, content], info.length + content.length));
			task.times && (task.times -= 1);
			task.last = Date.now();

			if (task.times === 0 && task.repeat != 0) {
				return false;
			}
			return true;
		});
		coroutine.sleep(2);
	}
}

module.exports = {
	start() {
		coroutine.start(quene);
	},
	addTask(task) {
		tasks.push(task);
	},
	setQueneServer(qs) {
		queneserver = qs;
	}
}