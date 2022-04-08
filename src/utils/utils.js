import * as logger from "./logger.cjs";
import * as fs from 'fs';
import path from "path";
import os from 'os';
import * as conf from '../../config/conf.cjs';
import child_process from "child_process";


const __dirname = path.resolve();

function mergeFuncs(funcs,seqName,callback){

    const kind = funcs[0].kind;

    if(kind.includes("nodejs")){
        logger.log("Merging nodejs actions","info");
        var param = funcs[0].param;
        var wrappedFunc = "function main("+param+") {";
        funcs.forEach(f => {
            wrappedFunc = wrappedFunc.concat(f.code);
        });

        funcs.forEach((f,i) => {
            if(i == funcs.length -1){
                wrappedFunc = wrappedFunc.concat("return ").concat(f.invocation).concat(param+");");
            }
            else{
                wrappedFunc = wrappedFunc.concat("var "+f.name+"Res = ").concat(f.invocation).concat(param+");");
                param = f.name+"Res";
            }
            
        });
        wrappedFunc = wrappedFunc.concat("}").concat(os.EOL);

        callback(wrappedFunc);
    }

    if(kind.includes("python")){

        logger.log("Merging python actions","info");
        var param = funcs[0].param;
        var wrappedFunc = "def main("+param+"):";

        funcs.forEach(f => {
            //wrappedFunc = wrappedFunc.concat("\n\t").concat(f.code);
            wrappedFunc = wrappedFunc.concat("\n");
            var codeArray = f.code.split(os.EOL);
            codeArray.forEach(line => {
                wrappedFunc = wrappedFunc.concat("\t").concat(line).concat("\n");
            });            
        });

        
        funcs.forEach((f,i) => {
            if(i == funcs.length -1){
                wrappedFunc = wrappedFunc.concat("\n\treturn ").concat(f.invocation).concat(param+")");
            }
            else{
                wrappedFunc = wrappedFunc.concat("\t").concat(f.name+"Res = ").concat(f.invocation).concat(param+")");
                param = f.name+"Res";
            }
        });
        callback(wrappedFunc);
    }

    
}



function mergeFuncsBinary(funcs,seqName,callback){

    logger.log("Merging actions","info");
    const timestamp = Date.now();
    

    const import_spawn = "var spawn= require('child_process').spawn;\n"
    const spawn_proc =  ["const process = spawn(",  // inserire il linguaggio "kind"
                        ", [./",  // inserire il nome dello script
                        ",", // inserires JSON.stringigy(args)
                        "]);\n"];

    const promise_spawn = "return new Promise((resolve, reject) =>{\n            process.stdout.on(\"data\", data =>{\n                resolve(data.toString());\n            })\n            process.stderr.on(\"data\", reject)\n        });\n"


    var param = funcs[0].param;
    fs.mkdirSync(__dirname + "/binaries/" + timestamp, { recursive: true });
    
    //vanno assolutamente modificate per essere estensibili
   
    
    var wrappedFunc = import_spawn.concat("function main("+param+") {\n");
    
    funcs.forEach(f => {
        if(!f.kind.includes("nodejs")){
            wrappedFunc = wrappedFunc.concat("\n");
            wrappedFunc = wrappedFunc.concat("function "+f.invocation+f.param+"){\n\n");
            // qua va la roba per il python script e la modifica del python script
            if(f.kind.includes("python")){
                const fileName = "/"+f.kind.split(":")[0]+Date.now()+".py";
                wrappedFunc = wrappedFunc.concat(spawn_proc[0]).concat(f.kind).concat(spawn_proc[1]).concat(fileName).concat(spawn_proc[2]).concat(JSON.stringigy(args)).concat(spawn_proc[3]).concat(";\n");
                wrappedFunc = wrappedFunc.concat(promise_spawn);
                wrappedFunc = wrappedFunc.concat("}\n");

                var codeArray = f.code.split(os.EOL);
                var newcode = "";
                codeArray.forEach(line => {
                    if(line.includes("print(")){
                        newcode = newcode.concat("#").concat(line).concat("\n");
                    }
                    else{
                        if(line.includes("return")){
                            line = line.replace("return ","print(");
                            newcode = newcode.concat(line).concat(")");
                        }else{
                            newcode = newcode.concat(line).concat("\n");
                        }
                    }
                });  

                
                let buff = new Buffer(newcode, 'utf8');
                fs.writeFileSync(__dirname + "/binaries/" + timestamp + fileName, buff,{encoding: "utf8"});
            }

        }else{
            wrappedFunc = wrappedFunc.concat(f.code).concat("\n");
        }
    });
    

    funcs.forEach((f,i) => {
        if(i == funcs.length -1){
            if(!f.kind.includes("nodejs")){
                wrappedFunc = wrappedFunc.concat(f.invocation).concat(param+")").concat(".then((result) =>{return result});\n")
            }else{
                wrappedFunc = wrappedFunc.concat("return ").concat(f.invocation).concat(param+");\n");
            }
        }
        else{
            if(!f.kind.includes("nodejs")){
                wrappedFunc = wrappedFunc.concat(f.invocation).concat(param+")").concat(".then((result)=>{")
            }else{
                wrappedFunc = wrappedFunc.concat("var "+f.name+"Res = ").concat(f.invocation).concat(param+");\n");
                param = f.name+"Res";
            }
        }
    });
    wrappedFunc = wrappedFunc.concat("}");


    let buff = new Buffer(wrappedFunc, 'utf8');
    var pjraw = {
        "name": "prova",
        "version": "1.0.0",
        "description": "An action written as an npm package.",
        "main": "index.js",
        "author": "FaaS-Optimizer",
        "license": "Apache-2.0",
        "dependencies": {
          "child_process": "latest"
        }
    };
    let pj = new Buffer(JSON.stringify(pjraw),"utf8");
    fs.writeFileSync(__dirname + "/binaries/" + timestamp + '/package.json', pj,{encoding: "utf8"});
    fs.writeFileSync(__dirname + "/binaries/" + timestamp + '/index.js', buff,{encoding: "utf8"});
    child_process.execSync('npm install');


    callback(timestamp);
}

function detectLangSimple(snippet){
    let tmpKind;
    if(snippet.includes("function ")){
        tmpKind = "nodejs";
    }
    if(snippet.includes("def ")){
        tmpKind = "python";
    }

    var suppKinds = [];
    conf.kinds.forEach(kind => {
        if(kind.includes(tmpKind)){
            suppKinds.push(kind);
        }
    });

    if(suppKinds.length <= 1){
        return suppKinds[0];
    }else{
        var max = 0;
        var realKind;
        suppKinds.forEach(k =>{
            const vers = k.split(":")[1];
            if(vers> max) {
                max = vers;
                realKind = k
            }
        });
        return realKind;
    }

    
}




export {mergeFuncs,mergeFuncsBinary,detectLangSimple};
