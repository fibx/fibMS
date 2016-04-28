#!/bin/bash
function exist()
{
	local array=($1)
	result=$(echo ${array[*]} |grep -q $2 && echo 1 || echo 0)
	return ${result}
}

sys=("center" "core" "producer" "consumer")

for sysname in ${sys[@]} 
do
	pid=$(ps -e | grep "fibjs ${sysname}/app.js")
	exist "${pid}" "grep"
	rs=$?
	if [ $rs == 0 ]
	then
		pidarr=($pid)
		kill ${pidarr[0]}
	fi
	echo $sysname
	nohup fibjs ${sysname}/app.js &
	disown %1
	sleep 2
done