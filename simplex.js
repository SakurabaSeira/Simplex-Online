function getResult(goal,limit){
	//调用getLoosen函数 将原先的限制条件矩阵进行扩充
	//加入松弛变量，基变量和价值系数
	var loosen=getLoosen(limit,goal);
	//建立一个新矩阵 存储扩充后的决策变量及其价值系数
	var cb=[];
	for(var i=0;i<(goal.length+loosen.length);i++){
		//插入决策变量，基变量和价值系数
		cb.push([goal[i]||0,i]);
	}
	while(true){
		//判断是否存在为负数项的约束条件
		var needAssist=false;
		for(var i of loosen){
			if(i[1]<0){
				needAssist=true;
			}
		}
		//如果存在，则需要使用对偶单纯形法消去负数项
		if(needAssist){
			var min=0,min_index=null;
			//寻找b列值最小的负数项 决定换出变量
			for(var i=0;i<loosen.length;i++){
				if(loosen[i][1]<min){
					min=loosen[i][1];
					min_index=i;
				}
			}
			//在决定换出变量后 决定换入变量
			var min2=Infinity,min_index2=null;
			for(var i=0;i<cb.length;i++){
				var num=loosen[min_index][0][i];
				if(num>=0) continue;
				var check=(getCheckNum(cb,loosen,i))/num;
				if(check<min2){
					min2=check;
					min_index2=i;
				}
			}
			if(typeof min_index2=='number'){
				//若成功寻找到换入变量 则对矩阵进行初等变换
				loosen[min_index][2]=min_index2;
				loosen[min_index][3]=cb[min_index2][0];
				updateMartix(loosen,min_index,min_index2);
			}
			//若找不到换入变量 则该矩阵不存在最优解 返回false值 结束函数运行
			else return false;
		}
		//若不存在为负数项的约束条件 则结束循环判断 转向单纯形法运算
		else break;
	}
	//进行单纯形法的操作步骤
	while(true){
		//判断是否存在正的检验数
		var max=0,max_index=null;
		for(var i=0;i<cb.length;i++){
			var check=getCheckNum(cb,loosen,i);
			//采取Bland规则 直接取下标最小的正检验数
			if(check>max){
				max=check;
				max_index=i;
				break;
			}
		}
		//若存在为正的检验数 则寻找最小的比值数
		if(typeof max_index=='number'){
			var min=Infinity,min_index=null,min_index2=null;
			for(var i=0;i<loosen.length;i++){
				var bizhi=getBizhiNum(cb,loosen,i,max_index);
				//若两个最小的比值数同时存在 则采取Bland规则 选择下标最小的一项
				if(typeof bizhi=='number'&&
					(bizhi<min||bizhi==min&&loosen[i][2]<min_index2)){
					min=bizhi;
					min_index=i;
					min_index2=loosen[i][2];
				}
			}
			if(typeof min_index=='number'){
				//换入决策变量和价值系数
				loosen[min_index][2]=max_index;
				loosen[min_index][3]=cb[max_index][0];
				//调用updateMartix函数 对矩阵进行初等变换
				updateMartix(loosen,min_index,max_index);
			}
		}
		//若已经不存在正的检验数 则直接跳出循环检索
		else break;
	}
	//使用一维数组表示最优结果
	var result=[];
	//将该数组进行初始化
	for(var i=0;i<cb.length;i++) result.push(0);
	//将b列的值读取入该数组
	for(var i of loosen){
		result[i[2]]=i[1];
	}
	//返回该数组
	return result;
};
//进行初等行变换
function updateMartix(loosen,index1,index2){
	var list=loosen[index1],num=list[0][index2];
	//对中心点所在行进行除法运算 将该中心点的值变为1
	for(var i=0;i<list[0].length;i++){
		list[0][i]/=num;
	}
	list[1]/=num;
	//通过加法和乘法运算 将中心点所在列的值变为0
	for(var i=0;i<loosen.length;i++){
		if(i==index1) continue;
		var num2=loosen[i][0][index2];
		for(var j=0;j<loosen[i][0].length;j++){
			loosen[i][0][j]-=(loosen[index1][0][j]*num2);
		}
		loosen[i][1]-=loosen[index1][1]*num2;
	}
};
//使用比值判别法 获取比值数θ
function getBizhiNum(cb,loosen,index,maxIndex){
	var num=loosen[index][0][maxIndex];
	//若系数为负 则该行不可能被换出 返回null
	if(num<=0) return null;
	return loosen[index][1]/num;
};
//获取检验数σ
function getCheckNum(cb,loosen,index){
	var num=cb[index][0];
	for(var i=0;i<loosen.length;i++){
	num-=(loosen[i][3]*loosen[i][0][index]);
	}
	return num;
};
//插入松弛变量，决策变量和价值系数
function getLoosen(limit,goal){
	var loosen=limit.slice(0);
	for(var i=0;i<limit.length;i++){
		//插入松弛变量
		for(var j=0;j<limit.length;j++){
			limit[i][0].push(i==j?1:0);
		}
		//插入决策变量
		limit[i].push(i+goal.length);
		//插入价值系数
		limit[i].push(0);
	}
	return loosen;
};

document.getElementById('get_result').addEventListener('click', function(){        
	//读取输入的问题
	var area=document.getElementById('text_input');
	var str=area.value;
	//获取问题的第一行 来得到目标函数
	var spliced=str.split("\n");
	var variables=[];
	var goals=[];
	//将所有的变量按+号和-号进行拆分
	var goal=spliced[0].slice(4).split(/[+-]/);
	var max=1;
	for(var i of goal){
		//跳过不存在数值的部分
		if(!i.length) continue;
		var j=i.split('*'),num=1;
		//读取变量的名称并置入数组读取
		//若变量名称前面没有乘号 则按照其价值系数为1进行处理
		if(j.length==1){
			variables.push(j[0]);
		}
		//否则读取该变量的价值系数
		else{
			variables.push(j[1]);
			num=Number(j[0]);
		}
		//判断该变量的正负性 若为负数 则将其价值系数乘以-1
		var index=spliced[0].indexOf(i)-1;
		if(spliced[index]=="-") num*=-1;
		//将该变量的价值系数记录到目标函数对应的数组中
		goals.push(num);
	}
	//若输入数据为求最小值 则将所有倍率乘以-1转换为求最大值的问题
	if(spliced[0].indexOf("min=")==0){
		max=-1;
		for(var i=0;i<goals.length;i++){
			goals[i]*=(-1);
		}
	}
	//将读取后的数据输出至控制台，用于debug调试
	console.log(goals);
	console.log(variables);
	//从输入的问题的第二行开始 依次读取每一项约束条件
	var limits=[];
	for(var ix=1;ix<spliced.length;ix++){
		//预定义系数的倍率为1
		var str=spliced[ix],sgn=1;
		//使用数组存储约束条件右侧的数值和左侧每个变量的技术系数
		var limit=[[],0];
		for(var i=0;i<goals.length;i++){
			limit[0].push(0);
		}
		var limitx;
		//若该条件为大于等于格式 则将系数倍率改为-1 转换为小于等于格式
		if(str.indexOf(">=")!=-1){
			sgn=-1;
			var list=str.split(">=");
			limitx=list[0].split(/[+-]/);
			limit[1]=-Number(list[1]);
		}
		else if(str.indexOf("<=")!=-1){
			var list=str.split("<=");
			limitx=list[0].split(/[+-]/);
			limit[1]=Number(list[1]);
		}
		else continue;
		//读取方法同上
		for(var i of limitx){
			if(!i.length) continue;
			var j=i.split('*'),num=1,variable;
			//拆分读取变量名称和技术系数
			if(j.length==1){
				variable=j[0];
			}
			else{
				variable=j[1];
				num=Number(j[0]);
			}
			var index=str.indexOf(i)-1;
			if(index>=0&&str[index]=="-") num*=(-1);
			//读取变量名称在先前的数组中存储的位置
			var ind=variables.indexOf(variable);
			//将系数乘以先前定义的系数倍率 存储至先前定义好的数组中
			if(ind>=0) limit[0][ind]=(num*sgn);
		}
		limits.push(limit);
		//将读取后的数据输出至控制台，用于debug调试
		console.log(limit[0].slice(0));
	}
	//调用getResult函数 对该线性规划问题求解
	var result=getResult(goals,limits);
	//若该线性规划问题无最优解 则将报错提示输出到网页 并退出函数
	if(!result){
		document.getElementById('text_result').innerHTML="该线性规划无最优解";
		return;
	}
	//生成求解后的结果文本
	var result_str="";
	for(var i=0;i<variables.length;i++){
		result_str+=variables[i];
		result_str+="=";
		result_str+=result[i];
		result_str+=(i==variables.length-1)?", ":"; ";
	}
	//计算目标函数的值
	var z=0;
	for(var i=0;i<goals.length;i++){
		z+=goals[i]*result[i];
	}
	if(max>0){
		result_str+=("max z="+z);
	}
	//若该模型为最小值模型 则将先前在最大值模型下求解出的结果乘以-1
	else{
		result_str+=("min z="+(-z));
	}
	//将结果输出到网页页面中
	document.getElementById('text_result').innerHTML=result_str;
},false);