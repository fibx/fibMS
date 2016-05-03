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
	const MAX_LIMIT = 100;
	
	while (true) {
		let limit = 0,
			task;

		while (task = tasks.poll()){
			
			let time = Date.now();
			limit++;

			if ((task.start === task.last && task.dealy && time - task.start < task.dealy) ||
				(task.start !== task.last && task.period && time - task.last < task.period)) {
				tasks.add(task);
			} else {
				let content = new Buffer(jrs.request(task.id, task.method, task.params)),
					info = new Buffer(`--fibMS-Length:${addZero(content.length + '', 8)}--`);

				queneserver && queneserver.conn && queneserver.conn.write(Buffer.concat([info, content], info.length + content.length));
				task.times && (task.times -= 1);
				task.last = Date.now();

				if (!(task.times === 0 && task.repeat != 0)) {
					tasks.add(task);
				}
			}

			if (limit > MAX_LIMIT){
				break;
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