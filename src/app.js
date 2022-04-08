import * as fs from 'fs';
import path from "path";
import * as utils from "./utils/utils.js";
import * as fg from "./owinteractions/funcGestures.js";
import * as zipgest from "./utils/zipGestures.cjs";
import * as logger from "./utils/logger.cjs";
import express from 'express';
import fetch from 'node-fetch';
import * as conf from '../config/conf.cjs';
const app = express();
app.use(express.json());

const httpsAgent = conf.httpsAgent;



app.get("/",(req,res)=>{
    res.json({"mex":"Service up and running!"});
});

app.post("/api/v1/action/mergeV4",(req,res)=>{

    logger.log("/api/v1/action/mergeV4","info");
    var funcs = [];
    const sequenceName = req.body.name;

    /*
        effettuo il controllo:
            se la somma dei wait time delle funzioni che compongono la sequence è > della duration delle funzioni stesse
            devo fare il merge
    
    fg.invokeActionWithParams().then((result)=>{
        const duration = result.duration;
        const waitTime = result.waitTime;
    })*/

    fg.getAction(sequenceName).then((result) => {
        var promises = [];
        
        if (Object.keys(result).includes("error")) {
            logger.log("Error getting sequence: " + sequenceName,"warn");
            logger.log(JSON.stringify(result),"warn");
            res.json(result);
            return;
        };

        result.exec.components.forEach(funcName => {
            var tmp = funcName.split('/');
            promises.push(
                
                fg.getAction(tmp[tmp.length -1])
                    .then((result) => {
                        const timestamp = Date.now();
                        var parsed = parseFunction(result,timestamp);
                        if(parsed.binary){
                            zipgest.cleanDirs(timestamp);
                        }
                        return parsed;

                    }).catch((error) => {
                        logger.log(error,"error");
                    })
            );
        });

        Promise.all(promises).then((result) =>
            funcs = result
        ).then(() => {

            if(funcs.length < 2)
                res.json({ mex: "An error occurred parsing functions" });

            var counter = 0;
            const prevKind = funcs[0].kind;
            for (let index = 1; index < funcs.length; index++) {
                if(funcs[index].kind === prevKind) {
                    counter++;
                }
            }

            if(counter == funcs.length -1){

                // le functions hanno tutte le stessa Kind (linguaggio) posso fonderle come plain text

                utils.mergeFuncs(funcs, sequenceName,function(wrappedFunc){

                    fg.deleteActionCB(sequenceName,function(){
                        fg.createAction(sequenceName,wrappedFunc,prevKind).then(()=>{
                            console.log(wrappedFunc)
                            res.json(wrappedFunc);
                        }).catch(()=>{
                            res.json({ mex: "An error occurred while creating new action" });
                        })   
                    });
                });
                
            }else{
                // le functions non hanno tutte le stessa Kind (linguaggio) devo fonderle come binary ( zip file )

                /**
                 * AL MOMENTO MI SEMBRA IMPOSSIBILE DA REALIZZARE, DOVREI PENSARCI MEGLIO
                 */
                utils.mergeFuncsBinary(funcs, sequenceName,function(timestamp_folder){
                    zipgest.zipDirLocal(timestamp_folder);

                    
                    fg.createAction("prova",timestamp_folder,"binary").then(()=>{
                        res.json(wrappedFunc);
                    }).catch(()=>{
                        res.json({ mex: "An error occurred while creating new action" });
                    })    
                    
                });
                
                /*
                fg.deleteActionCB(sequenceName,function(){
                    fg.createAction(sequenceName,folder,"binary").then(()=>{
                        res.json(wrappedFunc);
                    }).catch(()=>{
                        res.json({ mex: "An error occurred while creating new action" });
                    })    
                }).catch(()=>{
                    res.json({ mex: "An error occurred while deleting old sequence action" });
                });*/
            }
        });
    }).catch(err => {
        logger.log("An error occurred there's no sequence : " +sequenceName,"WARN")
        res.json("An error occurred while getting sequence "+sequenceName);
    });
});

app.post("/api/v1/action/merge",(req,res)=>{

    logger.log("/api/v1/action/merge-w-metrics","info");
    var funcs = [];
    const sequenceName = req.body.name;
    const sequenceParams = req.body.params;

    /*
        effettuo il controllo:
            se la somma dei wait time delle funzioni che compongono la sequence è > della duration delle funzioni stesse
            devo fare il merge
    */

    const seqMeasures = {"waitTime":"","initTime":"","duration":""};

    fg.invokeActionWithParams(sequenceName,sequenceParams).then((result)=>{
        seqMeasures.waitTime = result.annotation[1].value;
        seqMeasures.initTime = result.annotation[6].value;
        seqMeasures.duration = result.duration;

        
    });

    fg.getAction(sequenceName).then((result) => {
        var promises = [];
        
        if (Object.keys(result).includes("error")) {
            logger.log("Error getting sequence: " + sequenceName,"warn");
            logger.log(JSON.stringify(result),"warn");
            res.json(result);
            return;
        };

        result.exec.components.forEach(funcName => {
            var tmp = funcName.split('/');
            promises.push(
                
                fg.getAction(tmp[tmp.length -1])
                    .then((result) => {
                        const timestamp = Date.now();
                        var parsed = parseFunction(result,timestamp);
                        if(parsed.binary){
                            zipgest.cleanDirs(timestamp);
                        }
                        return parsed;

                    }).catch((error) => {
                        logger.log(error,"error");
                    })
            );
        });

        Promise.all(promises).then((result) =>
            funcs = result
        ).then(() => {

            if(funcs.length < 2)
                res.json({ mex: "An error occurred parsing functions" });

            /**
             * CALCOLO METRICHE SINGOLE FUNZIONI
             */

            const funcMeasures = getFuncMetrics(funcs);

            var counter = 0;
            const prevKind = funcs[0].kind;
            for (let index = 1; index < funcs.length; index++) {
                if(funcs[index].kind === prevKind) {
                    counter++;
                }
            }

            if(counter == funcs.length -1){

                // le functions hanno tutte le stessa Kind (linguaggio) posso fonderle come plain text

                utils.mergeFuncs(funcs, sequenceName,function(wrappedFunc){

                    fg.deleteActionCB(sequenceName,function(){
                        fg.createAction(sequenceName,wrappedFunc,prevKind).then(()=>{
                            console.log(wrappedFunc)
                            res.json(wrappedFunc);
                        }).catch(()=>{
                            res.json({ mex: "An error occurred while creating new action" });
                        })   
                    });
                });
                
                
                /*
                    BISOGNA INVOCARE LA SEQUENZA APPENA FATTA E PRENDERNE LE METRICHE PER VEDERE SE IL MERGE È STATO EFFICACE
                    SE SI POSSO CREARE LA NUOVA FUNZIONE
                */
                
            }else{

                logger.log("The sequence provided contains actions using different languages, merge not possible","info");
                res.json("The sequence provided contains actions using different languages, merge not possible","info")
                // le functions non hanno tutte le stessa Kind (linguaggio) devo fonderle come binary ( zip file )

                /*
                utils.mergeFuncsBinary(funcs, sequenceName,function(timestamp_folder){
                    zipgest.zipDirLocal(timestamp_folder);

                    
                    fg.createAction("prova",timestamp_folder,"binary").then(()=>{
                        res.json(wrappedFunc);
                    }).catch(()=>{
                        res.json({ mex: "An error occurred while creating new action" });
                    })    
                    
                });
                
                
                fg.deleteActionCB(sequenceName,function(){
                    fg.createAction(sequenceName,folder,"binary").then(()=>{
                        res.json(wrappedFunc);
                    }).catch(()=>{
                        res.json({ mex: "An error occurred while creating new action" });
                    })    
                }).catch(()=>{
                    res.json({ mex: "An error occurred while deleting old sequence action" });
                });*/

                /*
                    BISOGNA INVOCARE LA SEQUENZA APPENA FATTA E PRENDERNE LE METRICHE PER VEDERE SE IL MERGE È STATO EFFICACE
                    SE SI POSSO CREARE LA NUOVA FUNZIONE
                */

            }
        });
    }).catch(err => {
        logger.log("An error occurred there's no sequence : " +sequenceName,"WARN")
        res.json("An error occurred while getting sequence "+sequenceName);
    });
});

app.get("/api/v1/action/list", (req, res) => {
 
    console.log(__dirname);
    try {
        fetch('https://'+conf.API_HOST+'/api/v1/namespaces/_/actions',{
        headers: {
            'Authorization':'Basic '+ btoa(conf.API_KEY)
        },
        agent: httpsAgent
        })
        .then(response => response.json())
        .then(data => {
            res.json(data);
            logger.log("/api/v1/action/list" + data,"info")
        }).catch(err =>{
            logger.log("An error occurred while getting actions list","WARN")
            res.json("An error occurred while getting actions list");
        });
    } catch (error) {
        logger.log("An error occurred while getting actions list","error")
        res.json(error);
    }
    
});

app.post("/api/v1/action/invoke", (req, res) => {

    const funcName = req.body.name;
    logger.log("/api/v1/action/invoke","info");
    try {
        fetch('https://'+conf.API_HOST+'/api/v1/namespaces/_/actions/'+req.body.name+'?blocking=true',{
            headers: {
                'Authorization':'Basic '+ btoa(conf.API_KEY)
            },
            agent: httpsAgent
        })
        .then(response => response.json())
        .then(data => {
            logger.log("/api/v1/action/invoke" + data,"info");
            res.json({mex:data});
        }).catch(err =>{
            logger.log("An error occurred while invoking action: "+req.body.name,"WARN")
            res.json("An error occurred while invoking action: "+req.body.name);
        }); 
    } catch (error) {
        logger.log("An error occurred while invoking action: "+req.body.name,"error")
        res.json(error);
    }
});

app.post("/api/v1/action/invoke-with-params", (req, res) => {

    
    logger.log("/api/v1/action/invoke-with-params","info");
    try {
        (async () => {
            const rawResponse = await fetch('https://'+conf.API_HOST+'/api/v1/namespaces/_/actions/'+req.body.name+'?blocking=true', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization':'Basic '+ btoa(conf.API_KEY)
            },
            agent: httpsAgent,
            body: JSON.stringify(req.body.params)
            }).catch(err => {
                logger.log("An error occurred while invoking action: "+req.body.name,"WARN");
                logger.log(err,"WARN");
                res.json("An error occurred while invoking action: "+req.body.name);
            });
            const content = await rawResponse.json();
            logger.log("/api/v1/action/invoke-with-params "+ JSON.stringify(content),"info");
            res.json(content);
        })()
    } catch (error) {
        logger.log("An error occurred while invoking action: "+req.body.name,"error");
        res.json(error);
    }

});

app.post("/api/v1/action/get", (req, res) => {

    logger.log("/api/v1/action/get","info");

    try {
        fetch('https://'+conf.API_HOST+'/api/v1/namespaces/_/actions/'+req.body.name+'?blocking=true',{
        method: 'GET',
        headers: {
            'Authorization':'Basic '+ btoa(conf.API_KEY)
        },
        agent: httpsAgent
        })
        .then(response => response.json())
        .then(data => {
            res.json(data);
            logger.log("/api/v1/action/get " + data,"info")
        }).catch(err =>{
            logger.log("An error occurred while getting action: "+req.body.name,"WARN")
            res.json("An error occurred while getting action: "+req.body.name);
        });
    } catch (error) {
        logger.log("An error occurred while getting action: "+req.body.name,"error")
        res.json(error);
    }
    

});

app.post("/api/v1/action/delete", (req, res) => {

    const funcName = req.body.name;
    logger.log("/api/v1/action/delete","info");

    try {
        fetch('https://'+conf.API_HOST+'/api/v1/namespaces/_/actions/'+req.body.name,{
        method: 'DELETE',
        headers: {
            'Authorization':'Basic '+ btoa(conf.API_KEY)
        },
        agent: httpsAgent
      })
        .then(response => response.json())
        .then(data => {
            res.json(data);
            logger.log("/api/v1/action/delete " + data,"info")
        }).catch(err =>{
            logger.log("An error occurred while deleting action: "+req.body.name,"WARN")
            res.json("An error occurred while deleting action: "+req.body.name);
        });
    } catch (error) {
        logger.log("An error occurred while deleting action: "+req.body.name,"error")
        res.json(error);
    }
});

app.post("/api/v1/action/create", (req, res) => {

    logger.log("/api/v1/action/create","info");
    try {
        (async () => {
            const rawResponse = await fetch('https://'+conf.API_HOST+'/api/v1/namespaces/_/actions/'+req.body.name+'?overwrite=true', {
              method: 'PUT',
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization':'Basic '+ btoa(conf.API_KEY)
              },
              agent: httpsAgent,
              body: JSON.stringify({"namespace":"_","name":req.body.name,"exec":{"kind":req.body.fkind,"code":req.body.fbody},"annotations":[{"key":"web-export","value":true},{"key":"raw-http","value":false},{"key":"final","value":true}]})
            }).catch(err =>{
                logger.log("An error occurred while creating action: "+req.body.name,"WARN")
                res.json("An error occurred while creating action: "+req.body.name);
            });
            const content = await rawResponse.json();
          
            logger.log("/api/v1/action/create "+ content,"info");
            res.json({mex:content});
          })()
    } catch (error) {
        logger.log("An error occurred while creating action: "+req.body.name,"error")
        res.json(error);
    }
});

// vedi come fare gestione degli errori
function parseFunction(element,timestamp){

    logger.log("Parsing function","info");

    if (element.exec.binary) {
        logger.log("Binary function","info");

        //let buff = new Buffer.alloc(element.exec.code.length,element.exec.code, 'base64');
        let buff = new Buffer(element.exec.code, 'base64');

        fs.mkdirSync(__dirname + "/zipped/" + timestamp, { recursive: true });
        fs.writeFileSync(__dirname + "/zipped/" + timestamp + '/func.zip', buff);

        zipgest.extractZipLocal(timestamp);
       
        var func = fs.readFileSync(path.join(__dirname,"/extracted/"+timestamp+"/index.js"), 'utf8');
        var tmp = {
            "name": element.name, //string
            "code": func.substring(func.indexOf("function"), func.indexOf("function") + 9).concat(" " + element.name).concat(func.substring(func.indexOf("("))),
            "invocation": element.name + "(",
            "param": func.substring(func.indexOf("(") + 1, func.indexOf(")")),
            "binary": true,
            "kind": "binary"
        }
        return tmp;          
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

app.post("/api/v1/metrics/get", (req, res) => {
    
    var response = {"duration":"","waitTime":""};
    var metrics = ["openwhisk_action_duration_seconds_sum","openwhisk_action_duration_seconds_count","openwhisk_action_waitTime_seconds_sum","openwhisk_action_waitTime_seconds_count"]
    var metrics_collect= [];
    logger.log("/api/v1/metrics/get","info");

    var promises = [];
        
    metrics.forEach(metric => {
        promises.push(
            
                fetch('http://'+conf.METRICS_ENDPOINT+'query=rate('+metric+'{action="'+req.body.name+'"}[1d])',{
                method: 'GET',
                headers: {
                    'Authorization':'Basic '+ btoa(conf.API_KEY)
                },
                agent: httpsAgent
                })
                .then(response => {response.json()})
                .then(res => {
                    
                    if(Object.keys(res).includes("data")){
                        
                        return data.data.result[0].value[1]
                    }
                }).catch(err =>{
                    logger.log("An error occurred while retrieving metrics for action: "+req.body.name,"WARN")
                    logger.log(err,"WARN");
                })
            
        );
    });

        Promise.all(promises).then((result) =>
            metrics_collect = result
        ).then(() => {
            
            response.duration = Math.max(metrics_collect.slice(0,2)) > 0 ? Math.max(metrics_collect.slice(0,2)):0;
            response.waitTime = Math.max(metrics_collect.slice(2,4)) > 0 ? Math.max(metrics_collect.slice(2,4)):0;
            res.json(response);
        });   
});

export default app;

