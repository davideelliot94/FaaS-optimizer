import * as logger from "./logger.cjs";
import * as fs from 'fs';
import path from "path";
import os from 'os';
import * as conf from '../../config/conf.cjs';


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

function mergeFuncsBinary(funcs,seqName){

    logger.log("Merging actions","info");
    const timestamp = Date.now();
    var param = funcs[0].param;
    fs.mkdirSync(__dirname + "/binaries/" + timestamp, { recursive: true });
    
    const importsString = "import { spawn } from 'child_process'; \n"

    //vanno assolutamente modificate per essere estensibili
    const extProcStringStart =  "const extProc = spawn('";
    const extProcStringEnd = "', [fileName, arg1, arg2]);\n"
    const getProgResString = "const getProcResult= () => {\n"+"extProc.stdout.on('data', (data) => {\n"+"return data;"+"});\n"+"};\n";
    
    var wrappedFunc = importsString.concat("function main("+param+") {");
    
    funcs.forEach(f => {
        if(f.kind != "nodejs"){
            
            wrappedFunc.concat("\n");
            wrappedFunc.concat("function "+f.invocation+f.param+"){\n");
            // qua va la roba per il python script e la modifica del python script
            if(f.kind == "python"){
                const fileName = "/"+f.kind+Date.now()+".py";
                wrappedFunc.concat(extProcStringStart).concat(f.kind).concat("', ["+fileName+","+f.param+"]);\n");
                wrappedFunc.concat(getProgResString);
                wrappedFunc.concat("}\n");



                const newcode = f.code.replace("return","print(");
                newcode.concat(")");
                let buff = new Buffer(newcode, 'base64');
                fs.writeFileSync(__dirname + "/binaries/" + timestamp + fileName, buff);
            }

        }else{
            wrappedFunc = wrappedFunc.concat(f.code).concat("\n");
        }
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
    wrappedFunc = wrappedFunc.concat("}");

    let buff = new Buffer(wrappedFunc, 'base64');

    fs.writeFileSync(__dirname + "/binaries/" + timestamp + '/index.js', buff);

    return timestamp;
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
