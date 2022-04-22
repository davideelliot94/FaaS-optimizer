import * as logger from "../log/logger.cjs";
import * as fs from 'fs';
import path from "path";
import os from 'os';
import * as conf from '../../config/conf.cjs';
import child_process from "child_process";


const __dirname = path.resolve();

function mergeFuncsWithMetrics(funcs_metrics,seqName,is_binary,callback){
    var funcs = [];
    funcs_metrics.forEach(fm=>{
        if(fm.to_merge) funcs.push(fm.func);
    });

    if(is_binary){
        mergeFuncsBinary(funcs,seqName,function(result){
            callback(result);
        }) 
    }else{
        mergeFuncs(funcs,function(result){
            callback(result);
        })
    }

    
}

function mergeFuncs(funcs,callback){

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
    

    const import_spawn = "const {execSync} = require('child_process');\n"



    var param = funcs[0].param;
    const binaries = path.join(__dirname,"src/utils/binaries/");
    fs.mkdirSync(binaries+ timestamp, { recursive: true });
    
    //vanno assolutamente modificate per essere estensibili
   
    
    var wrappedFunc = import_spawn.concat("function main("+param+") {\n");
    
    funcs.forEach(f => {
        if(!f.kind.includes("nodejs")){
            wrappedFunc = wrappedFunc.concat("\n");
            wrappedFunc = wrappedFunc.concat("function "+f.invocation+f.param+"){\n\n");
            // qua va la roba per il python script e la modifica del python script
            if(f.kind.includes("python")){
                const fileName = f.kind.split(":")[0]+Date.now()+".py";
                wrappedFunc = wrappedFunc.concat("execSync('apt-get install python3');\n");
                wrappedFunc = wrappedFunc.concat("return JSON.parse(execSync(\"python3 "+fileName+" '\"+JSON.stringify("+f.param+")+\"'\").toString().replace(/'/g,'\"'));\n}\n")
                
                var codeArray = f.code.split(os.EOL);
                var newcode = "";
                let linecount = 0;
                codeArray.forEach(line => {
                    if(linecount == 0){
                        newcode = "import sys\nimport json\n";
                        linecount++;
                    }
                    if(line.includes("print(")){
                        newcode = newcode.concat("#").concat(line).concat("\n");
                    }
                    else{
                        if(line.includes("return")){
                            line = line.replace("return ","print(");
                            newcode = newcode.concat(line).concat(")");
                            newcode = newcode.concat("\n").concat(f.invocation).concat("json.loads(sys.argv[1]))\n") // dovrei vedere la funzione come si chiama
                        }else{
                            newcode = newcode.concat(line).concat("\n");
                        }
                    }
                    
                });  

                let buff = Buffer.from(newcode, 'utf8');

                fs.writeFileSync(binaries + timestamp +"/"+ fileName, buff,{encoding: "utf8"});
            }

        }else{
            wrappedFunc = wrappedFunc.concat(f.code).concat("\n");
        }
    });
    

    funcs.forEach((f,i) => {
        if(i == funcs.length -1){
            
            wrappedFunc = wrappedFunc.concat("return ").concat(f.invocation).concat(param+");\n");
            
        }
        else{
 
            wrappedFunc = wrappedFunc.concat("var "+f.name+"Res = ").concat(f.invocation).concat(param+");\n");
            param = f.name+"Res";
            
        }
    });
    wrappedFunc = wrappedFunc.concat("}").concat("exports.main = main;\n");

    let buff = Buffer.from(wrappedFunc, 'utf8');
    var pjraw = {
        "name": seqName,
        "version": "1.0.0",
        "description": "An action written as an npm package.",
        "main": "index.js",
        "author": "FaaS-Optimizer",
        "license": "Apache-2.0",
        "dependencies": {
          "child_process": "latest"
        }
    };
    let pj = Buffer.from(JSON.stringify(pjraw),"utf8");
    
    fs.writeFileSync(binaries+ timestamp + '/package.json', pj,{encoding: "utf8"});
    fs.writeFileSync(binaries+ timestamp + '/index.js', buff,{encoding: "utf8"});

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

    return tmpKind+":default";


    /*
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
    }   */
}

function getMainFileBinary(timestamp){

    const fullPath = path.join(__dirname,"src/utils/zip_workdir/extracted/"+timestamp+"/");

    var ls = child_process.execSync("ls "+fullPath).toString();
    var lsSplit = ls.split("\n");
    var func = "";
    lsSplit.forEach(elem =>{
        if(elem.includes(".js")){
            func = child_process.execSync("cat "+fullPath+"/*.js");
            
        }
        if(elem.includes(".py")){
            func = child_process.execSync("cat "+fullPath+"/*.py");

        }

    })

    return func.toString();
}


function checkToMerge(funcs_metrics,callback){
    var to_merge = false;

    funcs_metrics.forEach(f =>{
        if(f.duration < f.waitTime + f.initTime){
            funcs_metrics.to_merge = true;
        }
    })

    callback(funcs_metrics);

    /**
     * DOVREI CONTROLLARE SE IL WAIT TIME TOTALE DELLE FUNZIONI È MAGGIORE DELLA LORO DURATION ,SIGNIFICA CHE NON HA SENSO UTILIZZARLE IN UNA SEQUENZA
     * SIGNIFICA INVECE CHE STAREBBERO MEGLIO IN UNA SOLA FUNZIONA
     * 
     * INOLTRE SAREBBE IL CASO DI CONTEORLLARE INDIVIDUALMENTE QUALI FUNZIONI RENDONO LA SEQUENZA "NON BUONA" E FARE IL MERGE SOLO DI QUESTE FUNZIONI
    */

    /**
     * PER OGNI FUNZIONA, CONTROLLA SE func.duration < func.waitTime SE SI, FANNE IL MERGE
     * 
     */
    /*
    if(funcs_metrics.duration < funcs_metrics.waitTime){
        if(seq_metrics.duration + seq_metrics.waitTime + seq_metrics.initTime < funcs_metrics.duration + funcs_metrics.waitTime + funcs_metrics.waitTime);

        to_merge = true;
    }*/
}

export {mergeFuncs,mergeFuncsBinary,detectLangSimple,getMainFileBinary,mergeFuncsWithMetrics,checkToMerge};
