import * as fs from 'fs';
import path from "path";
import * as utils from "./utils/utils.js";
import * as fg from "./ow/action_gestures.js";
import * as zipgest from "./utils/zip_gestures.cjs";
import * as logger from "./log/logger.cjs";
import express from 'express';
import fetch from 'node-fetch';
import * as conf from '../config/conf.cjs';
const app = express();
app.use(express.json());
const __dirname = path.resolve();
const httpsAgent = conf.httpsAgent;



app.get("/",(req,res)=>{
    res.json({"mex":"Service up and running!"});
});

app.post("/api/v1/action/merge",(req,res)=>{

    logger.log("/api/v1/action/merge","info");
    var funcs = [];
    const sequenceName = req.body.name;

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
                        

                        var parsed = fg.parseFunction(result,timestamp);
                        if(parsed.binary){
                            zipgest.cleanDirs("/zip_workdir/extracted/"+timestamp);
                            zipgest.cleanDirs("/zip_workdir/zipped/"+timestamp);

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
                        fg.createActionCB(sequenceName,wrappedFunc,prevKind,function(result){            
                            res.json(result);
                        });
                    });
                });
                
            }else{
             
                utils.mergeFuncsBinary(funcs, sequenceName,function(timestamp_folder){
                    zipgest.zipDirLocal("binaries/"+timestamp_folder);
                    const pathToZip = path.join(__dirname,"/src/utils/binaries/");
                    const file = fs.readFileSync(pathToZip+timestamp_folder+".zip",'base64');
                    
                    fg.deleteActionCB(sequenceName,function(){         
                        fg.createActionCB(sequenceName,file,"nodejs:default",function(result){
                            zipgest.cleanDirs("/binaries/"+timestamp_folder);
                            res.json(result);
                        });    
                    })
                });
            }
        });
    }).catch(err => {
        logger.log(err,"WARN")
        res.json(err);
    });
});

app.post("/api/v1/action/optimize",(req,res)=>{

    logger.log("/api/v1/action/optimize","info");
    var funcs = [];
    const sequenceName = req.body.name;
    const sequencePart = sequenceName+"-part";
    var mergedFuncResponse;


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
                        sequencePart = sequencePart+timestamp;
                        var parsed = fg.parseFunction(result,timestamp);
                        if(parsed.binary){
                            zipgest.cleanDirs("/zip_workdir/extracted/"+timestamp);
                            zipgest.cleanDirs("/zip_workdir/zipped/"+timestamp);
                        }
                        return parsed;

                    }).catch((error) => {
                        logger.log(error,"error");
                        res.json(error)
                    })
            );
        });

        Promise.all(promises).then((result) =>
            funcs = result
        ).then(() => {

            if(funcs.length < 2)
                res.json({ mex: "An error occurred parsing functions, check if provided function is sequence?" });

            var func_metrics = [];
            funcs.forEach(f =>{
                var tmp = {"name":"","metrics":"","func":{},"to_merge":false};
                fg.getMetricsByFuncName(funcs.name,function(metric){
                    tmp.name = funcs.name;
                    tmp.metrics = metric;
                    tmp.func = f;
                    func_metrics.push(tmp);
                })
            });

            console.log(func_metrics);

            // true -> effettuo il merge, false -> non effettuo il merge

            utils.checkToMerge(func_metrics,function(func_to_merge){
                var to_m_count = 0;
                func_to_merge.forEach(fm =>{
                    if(fm.to_merge) to_m_count++;
                })
                
                var counter = 0;
                const prevKind = func_to_merge[0].func.kind;
                for (let index = 1; index < func_to_merge.length; index++) {
                    if(func_to_merge[index].func.kind === prevKind && func_to_merge[index].to_merge) {
                        counter++;
                    }
                    
                }

                var part_merge = false;
                if(to_m_count != funcs.length -1 ){
                    part_merge = true;
                }

                if(counter == to_m_count){

                    // le functions hanno tutte le stessa Kind (linguaggio) posso fonderle come plain text

                    /*
                        BISOGNA INVOCARE LA SEQUENZA APPENA FATTA E PRENDERNE LE METRICHE PER VEDERE SE IL MERGE È STATO EFFICACE?
                        SE SI POSSO CREARE LA NUOVA FUNZIONE
                    */
                    
                    utils.mergeFuncsWithMetrics(func_to_merge,sequenceName,false,function(wrappedFunc){

                        fg.deleteActionCB(sequenceName,function(){
                            fg.createActionCB(part_merge ? sequencePart:sequenceName,wrappedFunc,prevKind,function(result){  
                                
                                if(part_merge){
                                    var last_funcs = []
                                    last_funcs.push(sequencePart);
                                    func_to_merge.forEach(fm =>{
                                        if(!fm.to_merge) last_funcs.push(fm.name);
                                    })
                
                                    fg.createActionCB(sequenceName,last_funcs,"sequence",function(last_result){
                                        res.json({"mex":"Functions partially merged","function":last_result,"partial_function":result});
                                    }); 
                                }
                                
                                res.json(result);
                            });
                        });
                    });
                    
                }else{

                    //le functions non hanno tutte le stessa Kind (linguaggio) devo fonderle come binary ( zip file )

                    utils.mergeFuncsWithMetrics(func_to_merge, sequenceName,true,function(timestamp_folder){
                        zipgest.zipDirLocal("binaries/"+timestamp_folder);
                        const pathToZip = path.join(__dirname,"/src/utils/binaries/");
                        const file = fs.readFileSync(pathToZip+timestamp_folder+".zip",'base64');
                        
                        fg.deleteActionCB(sequenceName,function(){
                            fg.createActionCB(part_merge ? sequencePart:sequenceName,file,"nodejs:default",function(result){
                                zipgest.cleanDirs("/binaries/"+timestamp_folder);

                                if(part_merge){
                                    var last_funcs = []
                                    last_funcs.push(sequencePart);
                                    func_to_merge.forEach(fm =>{
                                        if(!fm.to_merge) last_funcs.push(fm.name);
                                    })
                
                                    fg.createActionCB(sequenceName,last_funcs,"sequence",function(last_result){
                                        res.json({"mex":"Functions partially merged","function":last_result,"partial_function":result});
                                    }); 
                                }

                                //res.json(result);
                            });  
                        })
                    });
                }
            });
        });
    }).catch(err => {
        logger.log(err,"WARN")
        res.json(err);
    });
});

app.get("/api/v1/action/list", (req, res) => {
 
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
            logger.log(err,"WARN")
            res.json(err);
        });
    } catch (error) {
        logger.log(error,"error")
        res.json(error);
    } 

});

app.post("/api/v1/action/invoke", (req, res) => {

    const funcName = req.body.name;
    logger.log("/api/v1/action/invoke","info");
    try {
        fetch('https://'+conf.API_HOST+'/api/v1/namespaces/_/actions/'+req.body.name+'?blocking=true',{
            method: 'POST',
            headers: {
                'Authorization':'Basic '+ btoa(conf.API_KEY)
            },
            agent: httpsAgent
        })
        .then(response => response.json())
        .then(data => {
            logger.log("/api/v1/action/invoke" + JSON.stringify(data),"info");
            res.json({mex:data});
        }).catch(err =>{
            logger.log(err,"WARN")
            res.json(err);
        }); 
    } catch (error) {
        logger.log(error,"error")
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
                logger.log(err,"WARN")
                res.json(err);
            });
            const content = await rawResponse.json();
            logger.log("/api/v1/action/invoke-with-params "+ JSON.stringify(content),"info");
            res.json(content);
        })()
    } catch (error) {
        logger.log(error,"error")
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
            logger.log(err,"WARN")
            res.json(err);
        });
    } catch (error) {
        logger.log(error,"error")
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
            logger.log(err,"WARN")
            res.json(err);
        });
    } catch (error) {
        logger.log(error,"error")
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
                logger.log(err,"WARN")
                res.json(err);
            });
            const content = await rawResponse.json();
          
            logger.log("/api/v1/action/create "+ content,"info");
            res.json({mex:content});
          })()
    } catch (error) {
        logger.log(error,"error")
        res.json(error);
    }
});

app.post("/api/v1/metrics/get", (req, res) => {
    
    logger.log("/api/v1/metrics/get","info");
    fg.getMetricsByFuncName(req.body.name,function(response){
        response.duration = response.duration + " ms";
        response.waitTime = response.waitTime + " ms";
        response.initTime = response.initTime + " ms";
        res.json(response);
    });
});


export default app;