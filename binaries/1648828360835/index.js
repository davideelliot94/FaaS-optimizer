import { spawn } from 'child_process'; 
function main(params) {
function  hello(params){
    var name = params.name;
    return {greeting: 'Hello, ' + name + '!'};
}



function niceDay(args){

const extProc = spawn('python', ['./python1648828360835.py',args]);
const getProcResult= () => {
extProc.stdout.on('data', (data) => {
return data;});
};

return getProcResult();
}
var helloRes = hello(params);
return niceDay(helloRes);
}