const coroutine = require("coroutine");
const collection = require("collection");
const jrs = require('./jsonrpc/serializer');

//{times,dealy,period}
let tasks = new collection.Queue(100*10000);
let queneserver = null;
function addZero(str, length){               
    return new Array(length - str.length + 1).join("0") + str;              
}

function quene() {
	while (true) {
		let time = Date.now(),
			task;

		while (task = tasks.poll()){
			if ((task.start === task.last && task.dealy && time - task.start < task.dealy) ||
				(task.start !== task.last && task.period && time - task.last < task.period)) {
				return tasks.add(task);
			}
			let content = new Buffer(jrs.request(task.id, task.method, task.params)),
				info = new Buffer(`--fibMS-Length:${addZero(content.length + '', 8)}--`);

			queneserver && queneserver.conn && queneserver.conn.write(Buffer.concat([info, content], info.length + content.length));
			task.times && (task.times -= 1);
			task.last = Date.now();

			if (!(task.times === 0 && task.repeat != 0)) {
				return tasks.add(task);
			}
		}

		coroutine.sleep(2);
	}
}

module.exports = {
	start() {
		coroutine.start(quene);
	},
	addTask(task) {
		tasks.add(task);
	},
	setQueneServer(qs) {
		queneserver = qs;
	}
}