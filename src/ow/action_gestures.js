import * as conf from '../../config/conf.cjs';
import * as fs from 'fs';
import path, { resolve } from "path";
import * as logger from "../log/logger.cjs";
import fetch from 'node-fetch';
import * as utils from "../utils/utils.js";
import * as zipgest from "../utils/zip_gestures.cjs"
const httpsAgent = conf.httpsAgent;

const __dirname = path.resolve();

//APIHOST VUOLE IP:PORT

async function invokeActionWithParams(funcName,params,blocking) {

    logger.log(params,"info");
    if(params != null && params != undefined){
        try {
            const rawResponse = await fetch('https://'+conf.API_HOST+'/api/v1/namespaces/_/actions/'+funcName+'?blocking='+blocking, {
              method: 'POST',
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization':'Basic '+ btoa(conf.API_KEY)
              },
              agent: httpsAgent,
              body: JSON.stringify(params)
            });
            const content = await rawResponse.json();
            logger.log("/api/v1/action/invoke-with-params"+ JSON.stringify(content),"info");
            return content;
        } catch (error) {
            logger.log(error,"ERROR");
            return error;
        }
    
    }else{
        try {
            const rawResponse = await fetch('https://'+conf.API_HOST+'/api/v1/namespaces/_/actions/'+funcName+'?blocking='+blocking,{
                method: 'POST',
                headers: {
                    'Authorization':'Basic '+ btoa(conf.API_KEY)
                },
                agent: httpsAgent
            });
            
            const content = await rawResponse.json();
            logger.log("/api/v1/action/invoke-with-params"+ JSON.stringify(content),"info");
            return content;
        } catch (error) {
            logger.log(error,"ERROR");
            return error;
        } 
    }	
}

function createActionCB(funcName,funcBody,fkind,merge_type,limits,callback){

    if(merge_type === "binary"){

        //MERGE DI TIPO BINARIO
        try {
            (async () => {
                const rawResponse = await fetch('https://'+conf.API_HOST+'/api/v1/namespaces/_/actions/'+funcName+'?overwrite=true', {
                  method: 'PUT',
                  headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Authorization':'Basic '+ btoa(conf.API_KEY)
                  },
                  agent: httpsAgent,
                  body: JSON.stringify({"namespace":"_","name":funcName,
                                        "exec":{"kind":fkind,"code":funcBody,"binary":"true"},
                                        "annotations":[{"key":"web-export","value":true},{"key":"raw-http","value":false},{"key":"final","value":true}],
                                        "limits":limits})
                }).catch(err =>{
                    logger.log(err,"warn");
                });
                const content = await rawResponse.json();
                
                logger.log("/api/v1/action/create "+ JSON.stringify(content),"info");
                callback(content);
                
              })()
        } catch (error) {
            logger.log(error,"error");
            return error;

        }
    }else{
        if(fkind == "sequence"){
    
            try {
                (async () => {
                    const rawResponse = await fetch('https://'+conf.API_HOST+'/api/v1/namespaces/_/actions/'+funcName+'?overwrite=true', {
                    method: 'PUT',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        'Authorization':'Basic '+ btoa(conf.API_KEY)
                    },
                    agent: httpsAgent,
                    body: JSON.stringify({"namespace":"_","name":funcName,
                                          "exec":{"kind":fkind,"components":funcBody},
                                          "annotations":[{"key":"web-export","value":true},{"key":"raw-http","value":false},{"key":"final","value":true}],
                                          "limits":limits})
                    });
                    const content = await rawResponse.json();
                    
                    logger.log("/api/v1/action/create "+ JSON.stringify(content),"info");
                    callback(content);
                    
                })()
            } catch (error) {
                logger.log(error,"error");
                return error;
            }
        }else{
            try {
                (async () => {
                    const rawResponse = await fetch('https://'+conf.API_HOST+'/api/v1/namespaces/_/actions/'+funcName+'?overwrite=true', {
                      method: 'PUT',
                      headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        'Authorization':'Basic '+ btoa(conf.API_KEY)
                      },
                      agent: httpsAgent,
                      body: JSON.stringify({"namespace":"_","name":funcName,
                                            "exec":{"kind":fkind,"code":funcBody},
                                            "annotations":[{"key":"web-export","value":true},{"key":"raw-http","value":false},{"key":"final","value":true}],
                                            "limits":limits})
                    });
                    const content = await rawResponse.json();
                    
                    logger.log("/api/v1/action/create "+ JSON.stringify(content),"info");
                    callback(content);
                    
                })()
            } catch (error) {
                logger.log(error,"error");
                return error;
            } 
        }
    }
}

function deleteActionCB(funcName,callback){

    try {
        fetch('https://'+conf.API_HOST+'/api/v1/namespaces/_/actions/'+funcName,{
        method: 'DELETE',
        headers: {
            'Authorization':'Basic '+ btoa(conf.API_KEY)
        },
        agent: httpsAgent
      })
        .then(response => response.json())
        .then(data => {  
            logger.log("/api/v1/action/delete " + JSON.stringify(data),"info");
            callback(data);
        }).catch(err =>{
            logger.log(err,"WARN");
            callback(error)
        });
    } catch (error) {  
        logger.log(error,"ERROR");
        callback(error)
    }
}

function listActionsCB(callback){

    try {
        fetch('https://' + conf.API_HOST + '/api/v1/namespaces/_/actions', {
            headers: {
                'Authorization': 'Basic ' + btoa(conf.API_KEY)
            },
            agent: httpsAgent
        })
        .then(response => response.json())
        .then(data => {
            logger.log("/api/v1/action/list" + data, "info")
            callback(data);
        }).catch(err => {
            logger.log(err, "WARN")
            callback(err);
        });
    } catch (error) {
        logger.log(error, "error");
        callback(error);
    }
}

async function getAction(funcName){ 

    logger.log("Getting action "+funcName,"info");   
    try {
        const response = await fetch('https://'+conf.API_HOST+'/api/v1/namespaces/_/actions/'+funcName+'?blocking=true',{
        method: 'GET',
        headers: {
            'Authorization':'Basic '+ btoa(conf.API_KEY)
        },
        agent: httpsAgent
      });

        const data =  response.json();
        logger.log("/api/v1/action/get " + data,"info");

        return data;
    } catch (error) {
        logger.log(error,"ERROR");
        return error;
    }
    
}

async function parseFunction(element,timestamp,binaries_timestamp){

    logger.log("Parsing function","info");

    if(element.exec.binary) {

        let buff = Buffer.from(element.exec.code,'base64');

        const dirPath = path.join(__dirname ,"src/utils/zip_workdir/zipped/") + timestamp;
        const zipPath = path.join(__dirname , "src/utils/zip_workdir/zipped/") + timestamp + '/func.zip';

        
        fs.mkdirSync(dirPath, { recursive: true });
        fs.writeFileSync(zipPath, buff);
        await zipgest.extractZipLocal(timestamp);
       
        //var func = utils.getMainFileBinary(timestamp); 

        
        //zipgest.cleanDirs("/zip_workdir/extracted/"+timestamp);
        var kind = element.exec.kind;

        
        if(kind.includes("nodejs")){
            var pack = JSON.parse(utils.getPackageInfoBinaryNode(timestamp));



            var func = utils.getMainFileBinary(timestamp,pack.main); 

            const binaries = path.join(__dirname,"src/utils/binaries/");
            fs.mkdirSync(binaries+ binaries_timestamp, { recursive: true });

            //ROUTINE PER LEGGERE IL CONTENUTO DI TUTTI I FILE 
            utils.copyAllFiles("/src/utils/zip_workdir/extracted/"+timestamp,"/src/utils/binaries/"+binaries_timestamp,pack.main)
            //const file_list =utils.copyAllFilesNew("/src/utils/zip_workdir/extracted/"+timestamp,"/src/utils/binaries/"+binaries_timestamp,pack.main)

            zipgest.cleanDirs("/zip_workdir/extracted/"+timestamp);


            let main_func;
            let main_func_invocation

            if (func.indexOf("exports.main") === -1){
                main_func = "main"
                main_func_invocation = func.substring(func.indexOf(main_func))

            }else{
                const last_line = (func.substring(func.indexOf("exports.main"),func.length))
                main_func = last_line.substring(last_line.indexOf("=")+1,last_line.indexOf(";")).trim()
                main_func_invocation = func.substring(func.indexOf(main_func))
            }
            

            

            //devo aggiungere una variabile a "invokation" per evitare duplicati nelle funzioni con stesso nome 

            var tmp = {
                "name": element.name, //string
                "code":func.replace(" "+main_func+"("," "+element.name +timestamp+"("),
                "invocation": element.name +timestamp+"(",
                "param":main_func_invocation.substring(main_func_invocation.indexOf(main_func+"(")+main_func.length + 1,main_func_invocation.indexOf(")")),
                "binary": true,
                "dependecies":(pack.dependencies === undefined || pack.dependencies === null )? "" :pack.dependencies,
                "kind": kind,
                "asynch":false,
                "limits":element.limits
            }

            
            if(tmp.code.includes("async ") || tmp.code.includes(" Promise") || tmp.code.includes(".then(")){
                tmp.asynch = true;
            }
            
            /*
            if(file_list.length > 0){
                file_list.forEach(lf=>{

                tmp.code = tmp.code.replace(lf.split("-")[0]+lf.split("-")[1],lf)
            })
            }
            
            */

            return tmp;
        }


        if(kind.includes("python")){

            //VA SCOMMENTATA TUTTA QUESTA ROBA
            //QUANDO SO CHE LE ROUTINE VANNO


            var func = utils.getMainFileBinary(timestamp,"__main__.py"); 

            const binaries = path.join(__dirname,"src/utils/binaries/");
            fs.mkdirSync(binaries+ binaries_timestamp, { recursive: true });

            //ROUTINE PER LEGGERE IL CONTENUTO DI TUTTI I FILE
            utils.copyAllFiles("/src/utils/zip_workdir/extracted/"+timestamp+"/","/src/utils/binaries/"+binaries_timestamp+"/","__main__.py")
            zipgest.cleanDirs("/zip_workdir/extracted/"+timestamp);


            let main_func;

            if (func.indexOf("main") === -1){
                // boh lo devo cercare
                main_func = "main"
            }else{
                main_func = "main"
            }

            var tmp = {
                "name": element.name, //string
                "code": func.replace(" "+main_func+"("," "+element.name +timestamp+"("),
                "invocation": element.name + timestamp+"(",
                "param": func.substring(func.indexOf(main_func+"(") +main_func.length+ 1, func.indexOf(")")),
                "binary": true,
                "dependecies":"",
                "kind": kind,
                "asynch":false,
                "limits":element.limits
            }

            if(tmp.code.includes("async ") || tmp.code.includes(" await ")){
                tmp.asynch = true;
            }

            /*
            if(file_list.length > 0){
                file_list.forEach(lf=>{
                    tmp.code = tmp.code.replace(" "+lf.split("-")[0]+" "," "+lf+" ")
                })
            }
            */
            return tmp;
        }     
     
    }
    else {
        logger.log("Not binary function","info");
        var func = element.exec.code
        var kind = utils.detectLangSimple(func);

        if(kind.includes("nodejs")){

            /**
             * DEVO PORTARMI APPRESSO I Node modules per dio
             */

            let main_func;
            let main_func_invocation

            if (func.indexOf("exports.main") === -1){
                main_func = "main";
                main_func_invocation = func.substring(func.indexOf(main_func))

            }else{
                const last_line = (func.substring(func.indexOf("exports.main"),func.length))
                main_func = last_line.substring(last_line.indexOf("=")+1,last_line.indexOf(";")).trim()
                main_func_invocation = func.substring(func.indexOf(main_func))
            }

            var func = element.exec.code;
            var tmp = {
                "name": element.name, //string
                //"code": func.substring(func.indexOf("function"), func.indexOf("function") + 9).concat(" " + element.name).concat(func.substring(func.indexOf("("))),
                "code":func.replace(" "+main_func+"("," "+element.name +timestamp+"("),
                "invocation": element.name +timestamp+ "(",
                //"param": func.substring(func.indexOf("(") + 1, func.indexOf(")")),
                "param":main_func_invocation.substring(main_func_invocation.indexOf(main_func+"(")+main_func.length + 1,main_func_invocation.indexOf(")")),
                "binary": false,
                "dependecies":"",
                "kind": kind,
                "asynch":false,
                "limits":element.limits
            }

            
            if(tmp.code.includes("async ") || tmp.code.includes(" Promise") || tmp.code.includes(".then(")){
                tmp.asynch = true;
            }

            return tmp;
        }

        //devo controllare come funziona per il main se python
        if(kind.includes("python")){

            let main_func;

            if (func.indexOf("main") === -1){
                // boh lo devo cercare
                main_func = "main"
            }else{
                main_func = "main"
            }

            var func = element.exec.code;
            var tmp = {
                "name": element.name, //string
                "code": func.replace(" "+main_func+"("," "+element.name +timestamp+"("),
                "invocation": element.name + timestamp+"(",
                "param": func.substring(func.indexOf(main_func+"(") +main_func.length+ 1, func.indexOf(")")),
                "binary": false,
                "dependecies":"",
                "kind": kind,
                "asynch":false,
                "limits":element.limits
            }

            if(tmp.code.includes("async ") || tmp.code.includes(" await ")){
                tmp.asynch = true;
            }

            return tmp;
        } 
    }
}

async function getMetricsByFuncNameAndPeriod(fname,period){ 
 
    var response = {"duration":"","waitTime":"","initTime":"","activations":"","coldStarts":""};
    const metrics = conf.metrics;
    let metrics_promise = [];
    
    metrics.forEach(metric => {
        metrics_promise.push(
            (async () => {
                var url = "";
                if(metric.includes("coldStarts") || metric.includes("activations") || metric.includes("status")){
                    if(metric.includes("status")){
                        url = 'http://'+conf.METRICS_ENDPOINT+'query=increase('+metric+'{action="'+fname+'",status=\"success\"}['+period+'])'
                    }else{
                        url = 'http://'+conf.METRICS_ENDPOINT+'query=increase('+metric+'{action="'+fname+'"}['+period+'])'
                    }
                }else{
                    url = 'http://'+conf.METRICS_ENDPOINT+'query=rate('+metric+'{action="'+fname+'"}['+period+'])'
                }

                const rawResponse = await fetch(url,{
                method: 'GET',
                headers: {
                    'Authorization':'Basic '+ btoa(conf.API_KEY)
                }
                }).catch(err =>{
                    logger.log(err,"WARN");
                    return -1;
                });

                if(rawResponse == -1) return rawResponse;
                const res =  await rawResponse.json();
            
                if(Object.keys(res).includes("data")){
                    if(res.data.result.length < 1){
                        return 0;
                    }else{
                        return Number.parseFloat(res.data.result[0].value[1]).toFixed(9);
                    }
                }else{
                    return -1;
                }
            })()
        )
    })

    return Promise.all(metrics_promise).then((metrics_collect)=>{
        response.duration = metrics_collect[1] > 0 ? (metrics_collect[0]/metrics_collect[1])*1000:0;
        response.waitTime = metrics_collect[3] > 0 ? (metrics_collect[2]/metrics_collect[3])*1000:0;
        response.initTime = metrics_collect[5] > 0 ? (metrics_collect[4]/metrics_collect[5])*1000:0;
        response.activations = metrics_collect[6] ;
        response.coldStarts = metrics_collect[7]

        logger.log("Retrieved duration,waitTime,initTime,activations,coldStarts metrics for action : " +fname,"info");
        logger.log(JSON.stringify(response),"info");
        return response;
    });
}

export {
        getAction,
        invokeActionWithParams,
        deleteActionCB,
        parseFunction,
        createActionCB,
        getMetricsByFuncNameAndPeriod,
        listActionsCB
    };