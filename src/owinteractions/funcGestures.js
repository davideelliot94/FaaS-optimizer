import * as conf from '../../config/conf.cjs';
import * as fs from 'fs';
import path, { resolve } from "path";
import * as logger from "../utils/logger.cjs";
import fetch from 'node-fetch';
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
            logger.log("An error occurred while invoking action: "+funcName,"WARN")
            res.json("An error occurred while invoking action: "+funcName);
        });
    }

	
}

///metti il catch sul fetchv e try/catch

async function createAction(funcName,funcBody,fkind){
    if(fkind == "binary"){

        const fullPath = path.join(__dirname,"../../binaries/")+funcBody+"/"+funcBody+".zip";
        console.log(fullPath)
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
                  //body: JSON.stringify({"namespace":"_","name":funcName,"exec":{"kind":fkind,"code":fullPath},"annotations":[{"key":"web-export","value":true},{"key":"raw-http","value":false},{"key":"final","value":true}]})
                  body: JSON.stringify({"namespace":"_","name":funcName,"exec":{"kind":"nodejs:default","code":fullPath,"binary":"true"},"annotations":[{"key":"web-export","value":true},{"key":"raw-http","value":false},{"key":"final","value":true}]})
                }).catch(err =>{
                    logger.log(err,"warn");
                });
                const content = await rawResponse.json();
                
                logger.log("/api/v1/action/create "+ JSON.stringify(content),"info");
                return content;
                
              })()
        } catch (error) {
            logger.log(err,"error");
        }
        
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
            
            logger.log("An error occurred while deleting action: "+funcName,"WARN")
            logger.log(err,"WARN");
            return err;
        });
    } catch (error) {
        
        logger.log("An error occurred while deleting action: "+funcName,"error");
        logger.log(err,"ERROR");
        return error;
    }

/*

    logger.log("Deleting action "+funcName,"info");
    
    const response = await fetch('https://'+conf.API_HOST+'/api/v1/namespaces/_/actions/'+funcName,{
        method: 'DELETE',
        headers: {
            'Authorization':'Basic '+ btoa(conf.API_KEY)
        },
        agent: httpsAgent
    });
    const data = response.json();
    
    logger.log("/api/v1/action/delete " + data,"info");
    return data;
*/
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
            
            logger.log("An error occurred while deleting action: "+funcName,"WARN")
            logger.log(err,"WARN");
        });
    } catch (error) {
        
        logger.log("An error occurred while deleting action: "+funcName,"error");
        logger.log(err,"ERROR");
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
/*
function parseFunction(element,timestamp){

    logger.log("Parsing actions from sequence","info");   
    if (element.exec.binary) {
        
        //let buff = Buffer.from(element.exec.code, 'base64');
        let buff = new Buffer(element.exec.code, 'base64');
        const currDir =  path.join(__dirname,"../zipped/"+timestamp);
        fs.mkdirSync(currDir, { recursive: true });
        fs.writeFileSync(currDir + '/func.zip', buff);

        zipgest.extractZipLocal(timestamp);
       
        var func = fs.readFileSync(path.join(__dirname,"../extracted/"+timestamp+"/index.js"), 'utf8');
        var tmp = {
            "name": element.name, //string
            "code": func.substring(func.indexOf("function"), func.indexOf("function") + 9).concat(" " + element.name).concat(func.substring(func.indexOf("("))),
            "invocation": element.name + "(",
            "param": func.substring(func.indexOf("(") + 1, func.indexOf(")")),
            "binary": element.exec.binary
        }
        return tmp;          
    }
    else {
        var func = element.exec.code;
        var tmp = {
            "name": element.name, //string
            "code": func.substring(func.indexOf("function"), func.indexOf("function") + 9).concat(" " + element.name).concat(func.substring(func.indexOf("("))),
            "invocation": element.name + "(",
            "param": func.substring(func.indexOf("(") + 1, func.indexOf(")")),
            "binary": element.exec.binary
        }
        return tmp;
    }
}*/

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
    
}

export {invokeAction,getAction,deleteAction,createAction,invokeActionWithParams,deleteActionCB,createActionBinaryTest};