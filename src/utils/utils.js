import * as logger from "../log/logger.cjs";
import * as fs from 'fs';
import path from "path";
import os from 'os';
import child_process from "child_process";
import { ifError } from "assert";


const __dirname = path.resolve();

function mergeFuncsBinarySameLangCB(funcs,seqName,binaries_timestamp,callback){


    /**
     * SUPPORTED LANGS:
        -NODEJS
        -PYTHON
    */

    logger.log("Merging same lang actions to binary","info");
    const fkind = funcs[0].kind;
    if(fkind.includes("nodejs")){
        //IF NODEJS

        var imports = "";
        var dependecies = {}
        var param = funcs[0].param;
        const binaries = path.join(__dirname,"src/utils/binaries/");
        //fs.mkdirSync(binaries+ timestamp, { recursive: true });
        
        //FOR LOOP PER SEGNARE TUTTI GLI IMPORT
        var nasync = 0
        funcs.forEach(f => {
            if(f.asynch){
                nasync++
            }
            if(f.binary){
                var lines = f.code.split(os.EOL);
                var new_code = ""
                lines.forEach(line => {
                    if(line.includes("import ") || line.includes("require(")){
                        // la riga contiene un import

                        /**
                         * 
                         * E SE UNO USA I REQUIRE E IMPORT INSIEME??
                         */
                        
                        imports = imports.concat(line).concat("\n");

                    }else{
                        if(!line.includes("exports.main")){
                            new_code = new_code.concat(line).concat("\n");
                        }
                        
                    }
                    
                })
                //recupero le corrette dipendenze
                if(f.dependecies != "") Object.assign(dependecies,f.dependecies);
                f.code = new_code;
            }
            
        });

        const importArray = imports.split(os.EOL);
        var uniqImports = [...new Set(importArray)];
        var importsString = "";
        if(uniqImports.length > 0){
            uniqImports.forEach(imp =>{
                importsString = importsString.concat(imp+"\n")
            })
        }
        var wrappedFunc = nasync  > 0 ? importsString.concat("async function main("+param+") {\n"):importsString.concat("function main("+param+") {\n");
        //var wrappedFunc = importsString.concat("function main("+param+") {\n");
        
        funcs.forEach(f => {
            
                wrappedFunc = wrappedFunc.concat(f.code).concat("\n");
            
        });
        

        funcs.forEach((f,i) => {
            if(i == funcs.length -1){
                if(f.asynch){
                    wrappedFunc = wrappedFunc.concat("return await ").concat(f.invocation).concat(param+");\n");
                }else{
                    wrappedFunc = wrappedFunc.concat("return ").concat(f.invocation).concat(param+");\n");

                }
            }
            else{
                if(f.asynch){
                    wrappedFunc = wrappedFunc.concat("var "+f.name+"Res = await ").concat(f.invocation).concat(param+");\n");
                }else{
                    wrappedFunc = wrappedFunc.concat("var "+f.name+"Res = ").concat(f.invocation).concat(param+");\n");
                }
    
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
            "dependencies": dependecies
        };
        let pj = Buffer.from(JSON.stringify(pjraw),"utf8");
        
        fs.writeFileSync(binaries+ binaries_timestamp + '/package.json', pj,{encoding: "utf8"});
        fs.writeFileSync(binaries+ binaries_timestamp + '/index.js', buff,{encoding: "utf8"});

        //CICLO PER SCRIVERE TUTTI GLI ALTRI FILES SE CE NE SONO

    }
    if(fkind.includes("python")){
        //IF PYTHON
    

        var imports = "";
        var param = funcs[0].param;
        const binaries = path.join(__dirname,"src/utils/binaries/");
        //fs.mkdirSync(binaries+ timestamp, { recursive: true });
        
        //FOR LOOP PER SEGNARE TUTTI GLI IMPORT
        var nasync = 0

        funcs.forEach(f => {
            if(f.asynch){
                nasync++
            }
            if(f.binary){
                var lines = f.code.split(os.EOL);
                var new_code = ""
                lines.forEach(line => {
                    if(line.includes("import ")){
                        // la riga contiene un import
                        
                        imports = imports.concat(line).concat("\n");
                    }else{
                        new_code = new_code.concat(line+"\n")                                   
                    }
                    
                })
                f.code = new_code;
            }
            
        });

        const importArray = imports.split(os.EOL);
        var uniqImports = [...new Set(importArray)];
        var importsString = "";
        if(uniqImports.length > 0){
            uniqImports.forEach(imp =>{
                importsString = importsString.concat(imp+"\n")
            })
        }
        var wrappedFunc = nasync  > 0 ? importsString.concat("async def main("+param+"):\n"):importsString.concat("def main("+param+"):\n");

        //var wrappedFunc = importsString.concat("def main("+param+"):\n");
        
        funcs.forEach(f => {

            var parsed_code = "";
            var flines = f.code.split(os.EOL);
            flines.forEach( line => {
                parsed_code = parsed_code.concat("\t").concat(line).concat("\n")
            })
            
                wrappedFunc = wrappedFunc.concat(parsed_code);
            
        });
        

        funcs.forEach((f,i) => {
            if(i == funcs.length -1){

                if(f.asynch){
                    wrappedFunc = wrappedFunc.concat("\treturn await ").concat(f.invocation).concat(param+")\n");
                }else{
                    wrappedFunc = wrappedFunc.concat("\treturn ").concat(f.invocation).concat(param+")\n");
                }   
                
                
            }
            else{

                if(f.asynch){
                    wrappedFunc = wrappedFunc.concat("\t"+f.name+"Res = await ").concat(f.invocation).concat(param+")\n");
                }else{
                    wrappedFunc = wrappedFunc.concat("\t"+f.name+"Res = ").concat(f.invocation).concat(param+")\n");
                }
                
                wrappedFunc = wrappedFunc.concat("\t"+f.name+"Res = ").concat(f.invocation).concat(param+")\n");
                param = f.name+"Res";
                
            }
        });

        let buff = Buffer.from(wrappedFunc, 'utf8');
        fs.writeFileSync(binaries+ binaries_timestamp + '/__main__.py', buff,{encoding: "utf8"});

        //CICLO PER SCRIVERE TUTTI GLI ALTRI FILES SE CE NE SONO

    }    
    callback(binaries_timestamp);

}

function mergeFuncsDiffLangPlainTextBinary(funcs,seqName,binaries_timestamp,callback){

    /**
     * MERGE DI DUE FUNZIONI DI LINGUAGGIO DIVERSO (non binarie) IN UNA FUNZIONE BINARIA NODEJS
     */

    logger.log("Merging actions","info");
    const timestamp = Date.now();

    var imports = "";
    var dependecies = {}
    const import_spawn = "const {execSync} = require('child_process');\n"

    var param = funcs[0].param;
    const binaries = path.join(__dirname,"src/utils/binaries/");
    fs.mkdirSync(binaries+ binaries_timestamp, { recursive: true });
    
    var wrappedFunc = import_spawn.concat("function main("+param+") {\n");
    
    funcs.forEach(f => {
        if(!f.kind.includes("nodejs")){

            wrappedFunc = wrappedFunc.concat("\n");
            wrappedFunc = wrappedFunc.concat("function "+f.invocation+f.param+"){\n\n");
            // qua va la roba per il python script e la modifica del python script
            if(f.kind.includes("python")){
                const fileName = f.kind.split(":")[0]+Date.now()+".py";
                //ATTIVA QUESTO PER PROVARE A VEDERE SE NON REINSTALLA PYTHON MILLE
                //wrappedFunc = wrappedFunc.concat("execSync('if [ $( python3 --version | grep -c \"Python \") -eq -1 ]; then apt-get install python3; fi');\n");
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

                fs.writeFileSync(binaries + binaries_timestamp +"/"+ fileName, buff,{encoding: "utf8"});
            }

        }else{
            if(f.binary){
                var lines = f.code.split(os.EOL);
                var new_code = ""
                lines.forEach(line => {
                    if(line.includes("import ") || line.includes("require(")){
                        // la riga contiene un import
                        /**
                         * 
                         * E SE UNO USA I REQUIRE E IMPORT INSIEME??
                         */
                        
                        imports = imports.concat(line).concat("\n");
                    }else{
                        if(!line.includes("exports.main")){
                            new_code = new_code.concat(line)
                        }                       
                    }   
                })
                //recupero le corrette dipendenze
                if(f.dependecies != "") Object.assign(dependecies,f.dependecies);
                f.code = new_code;
            }         

            wrappedFunc = wrappedFunc.concat(f.code).concat("\n");
        }
    });

    var importArray = imports.split(os.EOL);
    var uniqImports = [...new Set(importArray)];
    var importsString = "";
    if(uniqImports.length > 0){
        uniqImports.forEach(imp =>{
            importsString = importsString.concat(imp+"\n")
        })
    }
    
    Object.assign(dependecies,{"child_process": "latest"})
    var wrappedFunc = importsString.concat(wrappedFunc);    

    funcs.forEach((f,i) => {
        if(i == funcs.length -1){       
            wrappedFunc = wrappedFunc.concat("return ").concat(f.invocation).concat(param+");\n");
        }
        else{
            wrappedFunc = wrappedFunc.concat("var "+f.name+"Res = ").concat(f.invocation).concat(param+");\n");
            param = f.name+"Res";         
        }
    });
    wrappedFunc = wrappedFunc.concat("}\n").concat("exports.main = main;\n");

    let buff = Buffer.from(wrappedFunc, 'utf8');
    var pjraw = {
        "name": seqName,
        "version": "1.0.0",
        "description": "An action written as an npm package.",
        "main": "index.js",
        "author": "FaaS-Optimizer",
        "license": "Apache-2.0",
        "dependencies": dependecies
    };
    let pj = Buffer.from(JSON.stringify(pjraw),"utf8");
    
    fs.writeFileSync(binaries+ binaries_timestamp + '/package.json', pj,{encoding: "utf8"});
    fs.writeFileSync(binaries+ binaries_timestamp + '/index.js', buff,{encoding: "utf8"});

    callback(binaries_timestamp);
}

function mergePlainTextFuncs(funcs,callback){

    const kind = funcs[0].kind;

    if(kind.includes("nodejs")){
        logger.log("Merging nodejs actions","info");
        var param = funcs[0].param;
        var wrappedFunc = "function main("+param+") {";
        var nasync = 0
        funcs.forEach(f => {
            if(f.asynch){
                nasync++
            }
            wrappedFunc = wrappedFunc.concat(f.code);
        });

        if(nasync > 0){
            wrappedFunc = "async ".concat(wrappedFunc)
        }

        funcs.forEach((f,i) => {
            if(i == funcs.length -1){
                if(f.asynch){
                    wrappedFunc = wrappedFunc.concat("return await ").concat(f.invocation).concat(param+");\n");
                }else{
                    wrappedFunc = wrappedFunc.concat("return ").concat(f.invocation).concat(param+");\n");
                }         
            }
            else{
                if(f.asynch){
                    wrappedFunc = wrappedFunc.concat("var "+f.name+"Res = await ").concat(f.invocation).concat(param+");\n");
                }else{
                    wrappedFunc = wrappedFunc.concat("var "+f.name+"Res = ").concat(f.invocation).concat(param+");\n");
                }

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
                if(f.asynch){
                    wrappedFunc = wrappedFunc.concat("\n\treturn await ").concat(f.invocation).concat(param+")\n");
                }else{
                    wrappedFunc = wrappedFunc.concat("\n\treturn ").concat(f.invocation).concat(param+")\n");
                }
            }
            else{
                if(f.asynch){
                    wrappedFunc = wrappedFunc.concat("\t").concat(f.name+"Res = await ").concat(f.invocation).concat(param+")\n");
                }else{
                    wrappedFunc = wrappedFunc.concat("\t").concat(f.name+"Res = ").concat(f.invocation).concat(param+")\n");
                }           
                param = f.name+"Res";
            }
        });
        callback(wrappedFunc);
    }   
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
}

function getPackageInfoBinaryNode(timestamp){
    const fullPath = path.join(__dirname,"src/utils/zip_workdir/extracted/"+timestamp+"/");

    var ls = child_process.execSync("ls "+fullPath).toString();
    var lsSplit = ls.split("\n");
    var pack = "";
    lsSplit.forEach(elem =>{
        if(elem.includes(".json")){
            pack = child_process.execSync("cat "+fullPath+"/*.json");    
        }
    })

    return pack.toString();
}

function getMainFileBinary(timestamp,name){

    const fullPath = path.join(__dirname,"src/utils/zip_workdir/extracted/"+timestamp+"/");
    var func = "";
    func = child_process.execSync("cat "+fullPath+name);

    return func.toString();
}

function copyAllFilesNew(extracted,binaries,main_name){
    const fullPath_extracted = path.join(__dirname,extracted);
    const fullPath_binaries = path.join(__dirname,binaries);

    var lsFiles = child_process.execSync("ls -p "+fullPath_extracted +" | grep -v / ").toString();
    var lsSplitFiles = lsFiles.split("\n");
    var file_list = []    
    const timestamp = Date.now()
    lsSplitFiles.forEach(file =>{
        if(!file.includes(main_name) && file.length > 1){
            const tmp = file.split(".")
            child_process.execSync("cp -r "+fullPath_extracted+"/"+file + " " +fullPath_binaries+"/"+tmp[0]+"-"+timestamp+"."+tmp[1]); 
            file_list.push(tmp[0]+"-"+timestamp+"."+tmp[1])      
        }
    })

    var subDirCount = child_process.execSync("find "+ fullPath_extracted +"/ -maxdepth 1 -type d | wc -l");
    if(subDirCount > 1){
        var lsDirs = child_process.execSync("ls -d "+fullPath_extracted +"/*/").toString();
        var lsSplitDirs = lsDirs.split("\n");
        lsSplitDirs.forEach(dir =>{
            if(dir.length > 1 ){
                const dir_arr = dir.split("/");
                const dirname = dir_arr[dir_arr.length -2]

                child_process.execSync("cp -R "+fullPath_extracted+"/"+dirname + " " +fullPath_binaries+"/"+dirname);            
            }
        })
    }
    return file_list
}

function copyAllFiles(extracted,binaries,main_name){
    const fullPath_extracted = path.join(__dirname,extracted);
    const fullPath_binaries = path.join(__dirname,binaries);

    var lsFiles = child_process.execSync("ls -p "+fullPath_extracted +" | grep -v / ").toString();
    var lsSplitFiles = lsFiles.split("\n");
    const timestamp = Date.now()
    lsSplitFiles.forEach(file =>{
        if(!file.includes(main_name) && file.length > 1){
            child_process.execSync("cp -r "+fullPath_extracted+"/"+file + " " +fullPath_binaries+"/"+file+"-"+timestamp);       
        }
    })

    var subDirCount = child_process.execSync("find "+ fullPath_extracted +"/ -maxdepth 1 -type d | wc -l");
    if(subDirCount > 1){
        var lsDirs = child_process.execSync("ls -d "+fullPath_extracted +"/*/").toString();
        var lsSplitDirs = lsDirs.split("\n");
        lsSplitDirs.forEach(dir =>{
            if(dir.length > 1 ){
                const dir_arr = dir.split("/");
                const dirname = dir_arr[dir_arr.length -2]

                child_process.execSync("cp -R "+fullPath_extracted+"/"+dirname + " " +fullPath_binaries+"/"+dirname);            
            }
        })
    }
}

function applyMergePolicies(funcs_with_metrics,callback){

    let i = 0;
    funcs_with_metrics.forEach(f =>{
        if(i <= 1) {
            f.to_merge = true;
            i++;
        }else{
            f.to_merge = false;
            i = 0;
        }
        
        /*
        if(f.metrics.duration < f.metrics.waitTime){
            f.to_merge = true;
        }*/
/*
        if(f.metrics.coldStarts > SOGLIA){
            if(f.metrics.initTime > f.metrics.duration + f.metrics.waitTime){
                f.to_merge = true;
            }
        }*/
    })

    /**
     * 
     * BISOGNA  :
     *      VEDERE QUANTE VOLTE È STATA INVOCATA LA SEQUENZA PER VEDERE SE I COLD START DELLE FUNZIONI SONO EFFETTIVAMENTE DI INTERESSE 
     *      TROVARE UN PARAMETRO PER DEFINIRE QUANDO I COLD START SONO TROPPI
     */


    callback(funcs_with_metrics);
}

function checkPartialMerges(functions_array){

    let index = 0;
    var parsed_func_array = [];
    var tmp_array = [];

    while(index < functions_array.length) {
        const fi = functions_array[index];
        if(fi.to_merge) {
            tmp_array.push(fi);
            if(index +1 == functions_array.length) parsed_func_array.push(tmp_array)
        }else{
            if(tmp_array.length > 0){
                parsed_func_array.push(tmp_array)
                tmp_array = [];
            }
            parsed_func_array.push([fi]);
        }
        index++;
    }
    return parsed_func_array;

}

export {   
        mergePlainTextFuncs,
        mergeFuncsDiffLangPlainTextBinary,
        detectLangSimple,
        getMainFileBinary,
        applyMergePolicies,
        mergeFuncsBinarySameLangCB,
        getPackageInfoBinaryNode,
        copyAllFiles,
        checkPartialMerges
    };

