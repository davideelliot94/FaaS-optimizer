import * as fs from 'fs';
import path from "path";
import * as utils from "./utils/utils.js";
import * as fg from "./ow/action_gestures.js";
import * as zipgest from "./utils/zip_gestures.cjs";
import * as logger from "./log/logger.cjs";
import express from 'express';
import fetch from 'node-fetch';
import * as conf from '../config/conf.cjs';
import { time } from 'console';
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
        period = req.body.period;
    }
    
    var sequencePart = sequenceName+"-part";
    var mergedFuncResponse;

    fg.getAction(sequenceName).then((result) => {
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

        Promise.all(promises).then((result) =>
            funcs = result           
        ).then( () => {

            console.log("FUNCS "+funcs)

            if(funcs.length < 2){
                res.json({ mex: "An error occurred parsing functions, check if provided function is sequence?" });
                return;
            } 

            let func_metrics_promise = [];          
            
            funcs.forEach(f =>{

                if(period === null ){
                    func_metrics_promise.push(
                        
                        fg.getMetricsByFuncName(f.name).then((metrics)=>{

                            console.log("metrics "+metrics)
                            return metrics;
                            
                        })
                            
                        
                        
                        /*
                        fg.getMetricsByFuncName(f.name)
                        
                        .catch((error)=>{console.error(error)})*/
                        
                    )   
                }else{
                    func_metrics_promise.push(
                        fg.getMetricsByFuncNameAndPeriod(f.name,period).then((metric)=>{
                            
                            console.log("-------------metric-----------getMetricsByFuncNameCB-callback\n"+JSON.stringify(metric))
                            let tmp = {"name":"","metrics":{},"func":{},"to_merge":false};
    
                            tmp.name = f.name;
                            tmp.metrics = metric;
                            tmp.func = f;
                            console.log("--------TMP-----------getMetricsByFuncNameCB-CALLBACK")
                            console.log(JSON.stringify(tmp)); 
                            return tmp;
                        })
                    )   
                }
                
            });

            Promise.all(func_metrics_promise).then((respons_arr_raw_p)=>{
                console.log("mr -"+respons_arr_raw_p)
                Promise.all(respons_arr_raw_p).then((respons_arr_raw)=>{
                    console.log("5 -RESPONSE PROMISE RAW")
                console.log(respons_arr_raw)
            
                let payload = {"fname":"pippo","responses":[]}
                let responses = []
                respons_arr_raw.forEach(rawResponse => {
                    console.log("----------------RAW RESPONSE -----------------\n");
                    console.log( " " +rawResponse);
                    console.log("---------------------------------\n");

                    
                    const res = rawResponse;
                    console.log("----------------RESPONSE -----------------\n");
                    console.log( JSON.stringify(res));
                    console.log("---------------------------------\n");
                    
                    if(Object.keys(res).includes("data")){
                        if(res.data.result.length < 1){
                            responses.push(0)
                            //metrics_collect.push(0);
                        }else{
                            responses.push(Number.parseFloat(res.data.result[0].value[1]).toFixed(9));
                            //metrics_collect.push(Number.parseFloat(res.data.result[0].value[1]).toFixed(9));
                        }
                    }else{
                        console.log(responses)
                        responses.push(-1)
                    }
                    
                });
                payload.responses = responses
                return payload
                })

                
                
            })
/*

            Promise.allSettled(func_metrics_promise).then(raw=>{
                console.log(raw)
                let final = []
                raw.forEach(r =>{
                    final.push(r.value)
                })

                console.log("1 - func_metrics_promise " + final)
                return final
            })*/
            
            
            
        })

            console.log("metrics_payloadsp "+metrics_payloadsp)

            Promise.allSettled(metrics_payloadsp).then((mpraw)=>{

                    let metrics_payloads = []

                    mpraw.forEach(mpr =>{
                        metrics_payloads.push(mpr.value)
                    })

                    let final_metrics = []
                
                console.log(metrics_payloads)
                metrics_payloads.forEach(metrics_payload =>{
                    const fname = metrics_payload.fname
                    const metrics_collect = metrics_payload.responses;
                    var response = {"duration":"","waitTime":"","initTime":""};
                    console.log("-----------------------------------METRICS COLLECT----------------------------------------------\n")
                    console.log(metrics_collect)
                    console.log("-----------------------------------METRICS COLLECT----------------------------------------------\n")
        
                    response.duration = metrics_collect[1] > 0 ? (metrics_collect[0]/metrics_collect[1])*1000:0;
                    response.waitTime = metrics_collect[3] > 0 ? (metrics_collect[2]/metrics_collect[3])*1000:0;
                    response.initTime = metrics_collect[5] > 0 ? (metrics_collect[4]/metrics_collect[5])*1000:0;
                    logger.log("Retrieved duration,waitTime,initTime metrics for action : " +f.name,"info");
                    console.log("--------------------------- RESPONSE AFTER PROMISE ALL---------------------------------")
                    console.log(JSON.stringify(response));
                    console.log("--------------------------- RESPONSE AFTER PROMISE ALL---------------------------------")
        
                    const metric = response;
                    console.log("--------------\nMETRIC RESOLVED : \n"+JSON.stringify(metric)+"\n----------------------------------\n")                       
                    console.log("-------------metric-----------getMetricsByFuncNameCB-callback\n"+JSON.stringify(metric))
                    let tmp = {"name":"","metrics":{},"func":{},"to_merge":false};      
                    tmp.name = fname;        
                    tmp.metrics = metric;
                    tmp.func = f;
                    console.log("--------TMP-----------getMetricsByFuncNameCB-CALLBACK")
                    console.log(JSON.stringify(tmp));
                    final_metrics.push(tmp)
                })
                const func_metrics = final_metrics
                console.log("PROMISE RESOLVING funcs_metrics: "+JSON.stringify(func_metrics))
                
                utils.checkToMerge(func_metrics,function(func_to_merge){
                    
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
                    const prevKind = tmp_to_merge[0].func.kind;
                    for (let index = 1; index < tmp_to_merge.length; index++) {
                        if(tmp_to_merge[index].func.kind === prevKind) {
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
                        }); //mergeFuncsWithMetrics
                        
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
                        }); // mergeFuncsWithMetrics
                    } // if(counter == to_m_count){
                
                }) // checkToMerge
                    
            })// Promise.allSettled(metrics_payloadsp)
                
     
    }).catch(err => {
        logger.log(err,"WARN")
        res.json(err);
    });
});


app.post("/api/v1/action/optimize-mokup",async (req,res)=>{

    logger.log("/api/v1/action/optimize-mokup","info");
    var funcs = [];
    const sequenceName = req.body.name;
    var period = null;

    if(Object.keys(req.body).includes("period")){
        period = req.body.period;
    }
    
    var sequencePart = sequenceName+"-part";
    var mergedFuncResponse;

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

        Promise.all(promises).then((result) =>
            funcs = result           
        ).then( () => {

            console.log("FUNCS "+funcs)

            if(funcs.length < 2){
                res.json({ mex: "An error occurred parsing functions, check if provided function is sequence?" });
                return;
            } 

            let func_metrics_promise = [];          
            
            funcs.forEach(f =>{

                if(period === null ){
                    func_metrics_promise.push(
                        
                        fg.getMetricsByFuncName(f.name)    
                        
                    )   

                    // alternativamente - METODO 2
                    /*
                    const res = await fg.getMetricsByFuncName(f.name);
                    func_metrics_promise.push(res)*/
                }else{
                    func_metrics_promise.push(
                        fg.getMetricsByFuncNameAndPeriod(f.name,period).then((metric)=>{
                            
                            console.log("-------------metric-----------getMetricsByFuncNameCB-callback\n"+JSON.stringify(metric))
                            let tmp = {"name":"","metrics":{},"func":{},"to_merge":false};
    
                            tmp.name = f.name;
                            tmp.metrics = metric;
                            tmp.func = f;
                            console.log("--------TMP-----------getMetricsByFuncNameCB-CALLBACK")
                            console.log(JSON.stringify(tmp)); 
                            return tmp;
                        })
                    )   
                }
                
            });

            Promise.all(func_metrics_promise.map(function(func_metrics_entity){
                console.log("func_metrics_entity\n"+func_metrics_entity)
                return Promise.all(func_metrics_entity.map(function(func_metrics_item){
                    console.log("func_metrics_item\n"+func_metrics_item)
                  }));
            }))

            // SE HAI SCELTO METODO 2 SOPRA 
            /*
            function resolveMetric(metric) {
                return Promise.all(
                  metric.map(received_metric => {
                    return received_metric;
                  })
                );
              }

            const allMetricsParsed = func_metrics_promise.map(async func_metrics_entity => {
                const metric = await resolveMetric(func_metrics_entity)
                return metric;
              });

            const resolvedMetricsParsed = await Promise.all(allMetricsParsed);

            console.log(resolvedMetricsParsed)*/


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

app.post("/api/v1/metrics/get", async (req, res) => {
    
    logger.log("/api/v1/metrics/get","info");
    const p = req.body.period;
    /*
    var rawResponse;
    if(p !== null && p !== undefined){
        rawResponse = fg.getMetricsByFuncNameAndPeriod2(req.body.name,p);
        const response = await rawResponse;
        console.log("RESPONSE "+response)
        response.duration = response.duration + " ms";
        response.waitTime = response.waitTime + " ms";
        response.initTime = response.initTime + " ms";
        res.json(response);
    }else{
        rawResponse = fg.getMetricsByFuncName(req.body.name);
    }*/

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