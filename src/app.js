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

app.post("/api/v1/action/optimize",async (req,res)=>{

    logger.log("/api/v1/action/optimize","info");
    var funcs = [];
    const sequenceName = req.body.name;
    var period = null;

    if(Object.keys(req.body).includes("period")){
        period = "/"+req.body.period+"/";
    }
    
    var sequencePart = sequenceName+"-part";

    const result = await fg.getAction(sequenceName);
    var promises = [];
    
    if (Object.keys(result).includes("error")) {
        logger.log("Error getting sequence: " + sequenceName,"warn");
        logger.log(JSON.stringify(result),"warn");
        res.json(result);
        return;
    };

    if(result.exec.components === undefined){
        res.json("Seems like the provided function is not a sequence");
        return;
    }

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
                    res.json(error);
                    return;
                })
        );
    });

    Promise.all(promises).then((result) =>{
        result.forEach((r)=>{
            funcs.push({"function":r,"metrics":{},"to_merge":false})
        })
    }).then(async () => {

        console.log("FUNCS "+funcs)

        if(funcs.length < 2){
            res.json({ mex: "An error occurred parsing functions, check if provided function is a sequence" });
            return;
        } 

        const funcWithMetrics = funcs.map(async func =>{
            if(period === null){
                const metricsRaw =  await fg.getMetricsByFuncName(func.function.name);
                func.metrics =  metricsRaw;
                
            }else{
                const metricsRaw =  await fg.getMetricsByFuncNameAndPeriod(func.function.name,period);
                func.metrics =  metricsRaw;
                
            }
            return func;
            
        })
        const resolvedfuncWithMetrics = await Promise.all(funcWithMetrics);
     
        utils.checkToMerge(resolvedfuncWithMetrics,function(func_to_merge){
                
            var to_m_count = 0;
            var tmp_to_merge = [];
            func_to_merge.forEach(fm =>{
                if(fm.to_merge) {
                    tmp_to_merge.push(fm);
                    to_m_count++;
                }
            })

            if(to_m_count <= 1){
                logger.log("Apparently sequence "+sequenceName+" doesn't need to be optimized","info");
                res.json("Apparently sequence "+sequenceName+" doesn't need to be optimized");
                return;
            }
            
            var counter = 0;
            const prevKind = tmp_to_merge[0].function.kind;
            for (let index = 1; index < tmp_to_merge.length; index++) {
                if(tmp_to_merge[index].function.kind === prevKind) {
                    counter++;
                }
            }

            var part_merge = false;
            if(to_m_count != funcs.length ){
                part_merge = true;
            }

            if(counter == to_m_count){

                // le functions hanno tutte le stessa Kind (linguaggio) posso fonderle come plain text
                
                utils.mergeFuncsWithMetrics(func_to_merge,sequenceName,false,function(wrappedFunc){
                    fg.deleteActionCB(sequenceName,function(){
                        fg.createActionCB(part_merge ? sequencePart:sequenceName,wrappedFunc,prevKind,function(result){         
                            if(part_merge){
                                var last_funcs = []
                                last_funcs.push(sequencePart);
                                func_to_merge.forEach(fm =>{
                                    if(!fm.to_merge) last_funcs.push("/_/"+fm.function.name);
                                })
            
                                fg.createActionCB(sequenceName,last_funcs,"sequence",function(last_result){
                                    res.json({"mex":"Functions partially merged","function":last_result,"partial_function":result});
                                }); 
                            }else{
                                res.json(result);
                            }
                        });
                    });
                }); 
            }else{

                //le functions non hanno tutte le stessa Kind (linguaggio) devo fonderle come binary ( zip file )

                utils.mergeFuncsWithMetrics(func_to_merge, sequenceName,true,function(timestamp_folder){
                    zipgest.zipDirLocal("binaries/"+timestamp_folder)
                    const pathToZip = path.join(__dirname,"/src/utils/binaries/");
                    const file = fs.readFileSync(pathToZip+timestamp_folder+".zip",'base64');             
                    fg.deleteActionCB(sequenceName,function(){
                        fg.createActionCB(part_merge ? sequencePart:sequenceName,file,"nodejs:default",function(result){
                            zipgest.cleanDirs("/binaries/"+timestamp_folder);
                            if(part_merge){
                                var last_funcs = []
                                last_funcs.push(sequencePart);
                                func_to_merge.forEach(fm =>{
                                    if(!fm.to_merge) last_funcs.push("/_/"+fm.function.name);                                            
                                })
                                fg.createActionCB(sequenceName,last_funcs,"sequence",function(last_result){
                                    res.json({"mex":"Functions partially merged","function":last_result,"partial_function":result});
                                }); 
                            }else{
                                res.json(result);
                            }
                        });  
                    })
                }); 
            } 
        })

        

        
    })
    .catch(err => {
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

    fg.createActionCB(req.body.name,req.body.fbody,req.body.fkind,function(content){
        res.json(content);
    })

});

app.post("/api/v1/metrics/get", async (req, res) => {
    
    logger.log("/api/v1/metrics/get","info");
    const p = req.body.period;

    if(p !== null && p !== undefined){
        fg.getMetricsByFuncNameAndPeriodCB(req.body.name,p,function(response){
            console.log("RESPONSE "+response)
            response.duration = response.duration + " ms";
            response.waitTime = response.waitTime + " ms";
            response.initTime = response.initTime + " ms";
            res.json(response);
        });        
    }else{
        fg.getMetricsByFuncNameCB(req.body.name,function(response){
            console.log("RESPONSE "+response)
            response.duration = response.duration + " ms";
            response.waitTime = response.waitTime + " ms";
            response.initTime = response.initTime + " ms";
            res.json(response);
        });
    }

});

export default app;