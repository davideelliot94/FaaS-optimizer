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
//ANCORA NON HO CAPITO COME FARE CON LE KEY -> per questo "ignore_certs"

//metti il catch sul fetchv e try/catch

function invokeAction(funcName) {
	logger.log("/api/v1/action/invoke","info");
    fetch('https://'+conf.API_HOST+'/api/v1/namespaces/_/actions/'+funcName+'?blocking=true',{
        headers: {
            'Authorization':'Basic '+ btoa(conf.API_KEY)
        },
        agent: httpsAgent
    })
    .then(response => response.json())
    .then(data => {
        logger.log("/api/v1/action/invoke" + data,"info");
        return data;
    });
}

//metti il catch sul fetchv e try/catch
function invokeActionWithParams(funcName,params) {
    //mettere la specifica dei parametri
    logger.log(params,"info");
    if(params != null && params != undefined){
        (async () => {
            const rawResponse = await fetch('https://'+conf.API_HOST+'/api/v1/namespaces/_/actions/'+funcName+'?blocking=true', {
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
          })()
    
    }else{
        fetch('https://'+conf.API_HOST+'/api/v1/namespaces/_/actions/'+funcName+'?blocking=true',{
        headers: {
            'Authorization':'Basic '+ btoa(conf.API_KEY)
        },
        agent: httpsAgent
        })
        .then(response => response.json())
        .then(data => {
            logger.log("/api/v1/action/invoke" + data,"info");
            return data;
        }).catch(err =>{
            logger.log(err,"WARN")
            res.json(err);
        });
    }

	
}

///metti il catch sul fetchv e try/catch

async function createAction(funcName,funcBody,fkind){
    if(fkind == "binary"){

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
                  body: JSON.stringify({"namespace":"_","name":funcName,"exec":{"kind":"nodejs:default","code":funcBody,"binary":"true"},"annotations":[{"key":"web-export","value":true},{"key":"raw-http","value":false},{"key":"final","value":true}]})
                }).catch(err =>{
                    logger.log(err,"warn");
                });
                const content = await rawResponse.json();
                
                logger.log("/api/v1/action/create "+ JSON.stringify(content),"info");
                return content;
                
              })()
        } catch (error) {
            logger.log(error,"error");
        }
        
    }
    if(fkind == "sequence"){


        //COME SE FA?
        (async () => {
            const rawResponse = await fetch('https://'+conf.API_HOST+'/api/v1/namespaces/_/actions/'+funcName+'?overwrite=true', {
              method: 'PUT',
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization':'Basic '+ btoa(conf.API_KEY)
              },
              agent: httpsAgent,
              body: JSON.stringify({"namespace":"_","name":funcName,"exec":{"kind":fkind,"code":funcBody},"annotations":[{"key":"web-export","value":true},{"key":"raw-http","value":false},{"key":"final","value":true}]})
            });
            const content = await rawResponse.json();
            
            logger.log("/api/v1/action/create "+ JSON.stringify(content),"info");
            return content;
            
          })()
    }
    else{
        (async () => {
            const rawResponse = await fetch('https://'+conf.API_HOST+'/api/v1/namespaces/_/actions/'+funcName+'?overwrite=true', {
              method: 'PUT',
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization':'Basic '+ btoa(conf.API_KEY)
              },
              agent: httpsAgent,
              body: JSON.stringify({"namespace":"_","name":funcName,"exec":{"kind":fkind,"code":funcBody},"annotations":[{"key":"web-export","value":true},{"key":"raw-http","value":false},{"key":"final","value":true}]})
            });
            const content = await rawResponse.json();
            
            logger.log("/api/v1/action/create "+ JSON.stringify(content),"info");
            return content;
            
          })()
    }
    
}

function createActionCB(funcName,funcBody,fkind,callback){
    if(fkind == "binary"){

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
                  body: JSON.stringify({"namespace":"_","name":funcName,"exec":{"kind":"nodejs:default","code":funcBody,"binary":"true"},"annotations":[{"key":"web-export","value":true},{"key":"raw-http","value":false},{"key":"final","value":true}]})
                }).catch(err =>{
                    logger.log(err,"warn");
                });
                const content = await rawResponse.json();
                
                logger.log("/api/v1/action/create "+ JSON.stringify(content),"info");
                callback(content);
                
              })()
        } catch (error) {
            logger.log(error,"error");
        }
        
    }
    if(fkind == "sequence"){


        //COME SE FA?
        (async () => {
            const rawResponse = await fetch('https://'+conf.API_HOST+'/api/v1/namespaces/_/actions/'+funcName+'?overwrite=true', {
              method: 'PUT',
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization':'Basic '+ btoa(conf.API_KEY)
              },
              agent: httpsAgent,
              body: JSON.stringify({"namespace":"_","name":funcName,"exec":{"kind":fkind,"code":funcBody},"annotations":[{"key":"web-export","value":true},{"key":"raw-http","value":false},{"key":"final","value":true}]})
            });
            const content = await rawResponse.json();
            
            logger.log("/api/v1/action/create "+ JSON.stringify(content),"info");
            callback(content);
            
          })()
    }
    else{
        (async () => {
            const rawResponse = await fetch('https://'+conf.API_HOST+'/api/v1/namespaces/_/actions/'+funcName+'?overwrite=true', {
              method: 'PUT',
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization':'Basic '+ btoa(conf.API_KEY)
              },
              agent: httpsAgent,
              body: JSON.stringify({"namespace":"_","name":funcName,"exec":{"kind":fkind,"code":funcBody},"annotations":[{"key":"web-export","value":true},{"key":"raw-http","value":false},{"key":"final","value":true}]})
            });
            const content = await rawResponse.json();
            
            logger.log("/api/v1/action/create "+ JSON.stringify(content),"info");
            callback(content);
            
          })()
    }
    
}

//metti il catch sul fetchv e try/catch
async function deleteAction(funcName){


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
        }).catch(err =>{
            
            logger.log(err,"WARN")
            
            return err;
        });
    } catch (error) {
        
        logger.log(error,"ERROR");
        return error;
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
            callback();
        }).catch(err =>{
            
            logger.log(err,"WARN");
        });
    } catch (error) {
        
        logger.log(error,"ERROR");
    }

}

//metti il catch sul fetchv e try/catch

async function getAction(funcName){ 

    logger.log("Getting action "+funcName,"info");   

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
}

//vedi gestione errori
function parseFunction(element,timestamp){

    logger.log("Parsing function","info");

    if (element.exec.binary) {
        logger.log("Binary function","info");

        /*
            DEVO CONTROLLARE IN CHE LINGUAGGIO È LA FUNZIONE BINARY
        */
        let buff = Buffer.from(element.exec.code,'base64');

        const dirPath = path.join(__dirname ,"src/utils/zip_workdir/zipped/") + timestamp;
        const zipPath = path.join(__dirname , "src/utils/zip_workdir/zipped/") + timestamp + '/func.zip';
        fs.mkdirSync(dirPath, { recursive: true });
        fs.writeFileSync(zipPath, buff);

        zipgest.extractZipLocal(timestamp);
       
        var func = utils.getMainFileBinary(timestamp);        
        var kind = utils.detectLangSimple(func);

        if(kind.includes("nodejs")){
            var tmp = {
                "name": element.name, //string
                "code": func.substring(func.indexOf("function"), func.indexOf("function") + 9).concat(" " + element.name).concat(func.substring(func.indexOf("("))),
                "invocation": element.name + "(",
                "param": func.substring(func.indexOf("(") + 1, func.indexOf(")")),
                "binary": true,
                "kind": kind
            }
            return tmp;
        }

        if(kind.includes("python")){
            var tmp = {
                "name": element.name, //string
                "code": func.substring(func.indexOf("def"), func.indexOf("def") + 3).concat(" " + element.name).concat(func.substring(func.indexOf("("))),
                "invocation": element.name + "(",
                "param": func.substring(func.indexOf("(") + 1, func.indexOf(")")),
                "binary": true,
                "kind": kind
            }
            return tmp;
        }     
     
    }
    else {
        logger.log("Not binary function","info");

        var kind = utils.detectLangSimple(element.exec.code);
        if(kind.includes("nodejs")){
            var func = element.exec.code;
            var tmp = {
                "name": element.name, //string
                "code": func.substring(func.indexOf("function"), func.indexOf("function") + 9).concat(" " + element.name).concat(func.substring(func.indexOf("("))),
                "invocation": element.name + "(",
                "param": func.substring(func.indexOf("(") + 1, func.indexOf(")")),
                "binary": false,
                "kind": kind
            }

            return tmp;
        }

        if(kind.includes("python")){
            var func = element.exec.code;
            var tmp = {
                "name": element.name, //string
                "code": func.substring(func.indexOf("def"), func.indexOf("def") + 3).concat(" " + element.name).concat(func.substring(func.indexOf("("))),
                "invocation": element.name + "(",
                "param": func.substring(func.indexOf("(") + 1, func.indexOf(")")),
                "binary": false,
                "kind": kind
            }

            return tmp;
        } 
    }
}

/*
async function createActionBinaryTest(funcName,funcBody,fkind){
    if(fkind.includes("binary")){

        const fullPath = path.join(__dirname,"../utils/binaries/")+funcBody;

        (async () => {
            const rawResponse = await fetch('https://'+conf.API_HOST+'/api/v1/namespaces/_/actions/'+funcName+'?overwrite=true', {
              method: 'PUT',
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization':'Basic '+ btoa(conf.API_KEY)
              },
              agent: httpsAgent,
              body: JSON.stringify({"namespace":"_","name":funcName,"exec":{"kind":fkind,"code":fullPath},"annotations":[{"key":"web-export","value":true},{"key":"raw-http","value":false},{"key":"final","value":true}]})
            });
            const content = await rawResponse.json();
            
            logger.log("/api/v1/action/create "+ JSON.stringify(content),"info");
            return content;
            
          })()
    }
    else{
        (async () => {
            const rawResponse = await fetch('https://'+conf.API_HOST+'/api/v1/namespaces/_/actions/'+funcName+'?overwrite=true', {
              method: 'PUT',
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization':'Basic '+ btoa(conf.API_KEY)
              },
              agent: httpsAgent,
              body: JSON.stringify({"namespace":"_","name":funcName,"exec":{"kind":fkind,"code":funcBody},"annotations":[{"key":"web-export","value":true},{"key":"raw-http","value":false},{"key":"final","value":true}]})
            });
            const content = await rawResponse.json();
            
            logger.log("/api/v1/action/create "+ JSON.stringify(content),"info");
            return content;
            
          })()
    }
    
}*/

function getMetricsByFuncName(fname,callback){
    var response = {"duration":"","waitTime":"","initTime":""};
    const metrics = conf.metrics;
    var metrics_collect= [];

    var promises = [];
        
    metrics.forEach(metric => {
        promises.push(
            
                fetch('http://'+conf.METRICS_ENDPOINT+'query=rate('+metric+'{action="'+fname+'"}[1d])',{
                method: 'GET',
                headers: {
                    'Authorization':'Basic '+ btoa(conf.API_KEY)
                }
                })
                .then(response => response.json())
                .then(res => {
                    
                    if(Object.keys(res).includes("data")){
                        return Number.parseFloat(res.data.result[0].value[1]).toFixed(9);
                    }
                }).catch(err =>{
                    logger.log(err,"WARN");
                })
            
        );
    });

    Promise.all(promises).then((result) =>
        metrics_collect = result
    ).then(() => {
        
        response.duration = metrics_collect[1] > 0 ? (metrics_collect[0]/metrics_collect[1])*1000:0;
        response.waitTime = metrics_collect[3] > 0 ? (metrics_collect[2]/metrics_collect[3])*1000:0;
        response.initTime = metrics_collect[5] > 0 ? (metrics_collect[4]/metrics_collect[5])*1000:0;
        logger.log("retrieved duration,waitTime,initTime metrics for action : " +fname,"info");
        logger.log(JSON.stringify(response),"info");
        callback(response) ;
    });   
}

export {invokeAction,getAction,deleteAction,createAction,invokeActionWithParams,deleteActionCB,getMetricsByFuncName,parseFunction,createActionCB};