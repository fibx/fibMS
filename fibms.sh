#!/bin/bash
cd center && npm install
cd ../
rm -rf nohup.out

sys=("center" "core" "producer" "consumer")

for sysname in ${sys[@]} 
do
	pid=($(ps -ef | grep "fibjs ${sysname}/app.js"))
	if [ "${pid[7]}" != "grep" ]
	then
		echo "kill ${pid[1]}"
		kill ${pid[1]}
	fi
	sleep 5
	echo "start ${sysname}"
	nohup fibjs ${sysname}/app.js &
	disown %1
done