const coroutine = require("coroutine");
const jrs = require('./jsonrpc/serializer');

//{times,dealy,period}
let tasks = [];
let queneserver = null;

function quene() {
	while (true) {
		let time = Date.now();
		tasks = tasks.filter(task => {
			if ((task.start === task.last && task.dealy && time - task.start < task.dealy) || 
				(task.start !== task.last && task.period && time - task.last < task.period)) {
				return true;
			}
			queneserver && queneserver.conn && queneserver.conn.write('---fibMS---' + jrs.request(task.id, task.method, task.params));
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