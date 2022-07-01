import fs from "fs";
import * as utils from "./utils/utils.js";
import * as fg from "./ow/action_gestures.js";
import * as zipgest from "./utils/zip_gestures.cjs";
import * as logger from "./log/logger.cjs";
import express from 'express';
import fetch from 'node-fetch';
import * as conf from '../config/conf.cjs';
import { fstat } from "fs";


const app = express();
app.use(express.json());
const httpsAgent = conf.httpsAgent;

/** ROUTES  */

app.get("/", (req, res) => {
    res.json({ "response": "Service up and running!" });
});

app.post("/api/v1/action/merge", (req, res) => {

    logger.log("/api/v1/action/merge", "info");
    var funcs = [];
    const sequenceName = req.body.name;
    const binaries_timestamp = Date.now();
    

    fg.getAction(sequenceName).then((result) => {
        var promises = [];
        if(!Object.keys(result.exec).includes("components")){
            res.json("Provided action is not a sequence")
        }

        if (Object.keys(result).includes("error")) {
            logger.log("Error getting sequence: " + sequenceName, "warn");
            logger.log(JSON.stringify(result), "warn");
            res.json(result);
            return;
        };

        result.exec.components.forEach(funcName => {
            var tmp = funcName.split('/');
            promises.push(

                fg.getAction(tmp[tmp.length - 1])
                    .then((result) => {

                        if (Object.keys(result.exec).includes("components")) {

                            return 0;
                        }
                        const timestamp = Date.now();

                        var parsed = fg.parseFunction(result, timestamp,binaries_timestamp);
                        return parsed;


                    }).catch((error) => {
                        logger.log(error, "error");
                    })
            );
        });

        Promise.all(promises).then((result) =>
            funcs = result
        ).then(() => {

            if (funcs.length < 2)
                res.json({ mex: "An error occurred parsing functions" });

            let sub_seq_detected = false;
            let i = 0;
            for (i; i < funcs.length - 1; i++) {
                if (funcs[i] == 0) {
                    sub_seq_detected = true;
                    break;
                }
            }

            if (sub_seq_detected) {
                logger.log("Sub-sequence detected", "info")
                res.json({ mex: "Sub-sequence detected, atm is not possible to optimizer sequence containing sub sequences!" })
                return;
            }

            var counter = 0;
            const prevKind = funcs[0].kind;
            var merged_seq_limits = funcs[0].limits
            var binary_count = funcs[0].binary ? 1:0;
            for (let index = 1; index < funcs.length; index++) {

                //COUNTER DELLE KIND UGUALI
                if (funcs[index].kind.split(":")[0] == prevKind.split(":")[0] ) {
                    counter++;
                }

                //COUNTER DEL NUMERO DI FUNZIONI BINARIE
                if (funcs[index].binary) {
                    binary_count++;
                }

                //SETTAGGIO CORRETTO DEI LIMITS

                merged_seq_limits.concurrency = merged_seq_limits.concurrency >= funcs[index].limits.concurrency ? merged_seq_limits.concurrency:funcs[index].limits.concurrency
                merged_seq_limits.logs = merged_seq_limits.logs >= funcs[index].limits.logs ? merged_seq_limits.logs:funcs[index].limits.logs;
                merged_seq_limits.memory = merged_seq_limits.memory >= funcs[index].limits.memory ? merged_seq_limits.memory:funcs[index].limits.memory
                merged_seq_limits.timeout = merged_seq_limits.timeout >= funcs[index].limits.timeout ? merged_seq_limits.timeout:funcs[index].limits.timeout
            }

            if (counter == funcs.length - 1) {
                // Le functions hanno tutte le stessa kind
                if (binary_count > 0) {
                    // almeno una binaria 

                    utils.mergeFuncsBinarySameLangCB(funcs, sequenceName,binaries_timestamp, function (timestamp_folder) {
                        zipgest.zipDirLocalCB("binaries/" + timestamp_folder, (file) => {
                            fg.deleteActionCB(sequenceName, function (data) {
                                fg.createActionCB(sequenceName, file, prevKind,"binary",merged_seq_limits, function (result) {
                                    zipgest.cleanDirs("/binaries/" + timestamp_folder);
                                    zipgest.cleanDirs("/binaries/" + timestamp_folder + ".zip");
                                    res.json(result);
                                });
                            })
                        })
                    })

                } else {
                    // solo plain text
                    utils.mergePlainTextFuncs(funcs, function (wrappedFunc) {
                        fg.deleteActionCB(sequenceName, function (data) {
                            fg.createActionCB(sequenceName, wrappedFunc, prevKind,"plain",merged_seq_limits, function (result) {
                                res.json(result);
                            });
                        });
                    });
                }

            } else {

                //LA FUNZIONE FA IL MERGE DI FUNZIONI DI LUNGUAGGIO DIVERSO MA NON DI FUNZIONI 
                //PLAIN TEXT CON FUNZIONI BINARIE

                utils.mergeFuncsDiffLangPlainTextBinary(funcs, sequenceName,binaries_timestamp, function (timestamp_folder) {
                    zipgest.zipDirLocalCB("binaries/" + timestamp_folder, (file) => {
                        fg.deleteActionCB(sequenceName, function (data) {
                            fg.createActionCB(sequenceName, file,"nodejs:default" ,"binary",merged_seq_limits, function (result) {
                                zipgest.cleanDirs("/binaries/" + timestamp_folder);
                                zipgest.cleanDirs("/binaries/" + timestamp_folder + ".zip");
                                res.json(result);
                            });
                        })
                    })
                });        
                
            }
        });
    }).catch(err => {
        logger.log(err, "WARN")
        res.json(err)
    });
});

app.post("/api/v1/action/optimize-no-part-seq", async (req, res) => {

    logger.log("/api/v1/action/optimize-no-part-seq", "info");
    var funcs = [];
    const sequenceName = req.body.name;
    const binaries_timestamp = Date.now();
    var period = null;

    if (Object.keys(req.body).includes("period")) {
        period = "/" + req.body.period + "/";
    }

    const result = await fg.getAction(sequenceName);
    var promises = [];

    if (Object.keys(result).includes("error")) {
        logger.log("Error getting sequence: " + sequenceName, "warn");
        logger.log(JSON.stringify(result), "warn");
        res.json(result);
        return;
    };

    if (result.exec.components === undefined) {
        res.json("Seems like the provided function is not a sequence");
        return;
    }

    result.exec.components.forEach(funcName => {

        var tmp = funcName.split('/');
        promises.push(

            fg.getAction(tmp[tmp.length - 1])
                .then((result) => {

                    if (Object.keys(result.exec).includes("components")) {

                        return 0;
                    }

                    const timestamp = Date.now();
                    var parsed = fg.parseFunction(result, timestamp,binaries_timestamp);
                    return parsed;

                }).catch((error) => {
                    logger.log(error, "error");
                    res.json(error);
                    return -1;
                })
        );
    });

    Promise.all(promises).then((result) => {
        result.forEach((r) => {
            funcs.push({ "function": r, "metrics": {}, "to_merge": false })
        })
    }).then(async () => {

        if (funcs.length < 2) {
            res.json({ mex: "An error occurred parsing functions, check if provided function is a sequence" });
            return;
        }

        let sub_seq_detected = false;
        let i = 0;
        for (i; i < funcs.length - 1; i++) {
            if (funcs[i].function == 0) {
                sub_seq_detected = true;
                break;
            }
        }

        if (sub_seq_detected) {
            logger.log("Sub-sequence detected", "info")
            res.json({ mex: "Sub-sequence detected, atm is not possible to optimizer sequence containing sub sequences!" })
            return;
        }

        const funcWithMetrics = funcs.map(async func => {
            if (period === null) {
                const metricsRaw = await fg.getMetricsByFuncName(func.function.name);
                func.metrics = metricsRaw;

            } else {
                const metricsRaw = await fg.getMetricsByFuncNameAndPeriod(func.function.name, period);
                func.metrics = metricsRaw;

            }
            return func;

        })
        const resolvedfuncWithMetrics = await Promise.all(funcWithMetrics);

        utils.applyMergePolicies(resolvedfuncWithMetrics, function (tmp_to_merge) {

            var counter = 0;
            const prevKind = tmp_to_merge[0].function.kind;
            var merged_seq_limits = tmp_to_merge[0].function.limits
            var binary_count = tmp_to_merge[0].function.binary ? 1:0;

            for (let index = 1; index < tmp_to_merge.length; index++) {
                if (tmp_to_merge[index].function.kind.split(":")[0] === prevKind.split(":")[0]) {
                    counter++;
                }

                if (tmp_to_merge[index].function.binary) {
                    binary_count++;
                }

                merged_seq_limits.concurrency = merged_seq_limits.concurrency >= tmp_to_merge[index].function.limits.concurrency ? merged_seq_limits.concurrency:tmp_to_merge[index].function.limits.concurrency
                merged_seq_limits.logs = merged_seq_limits.logs >= tmp_to_merge[index].function.limits.logs ? merged_seq_limits.logs:tmp_to_merge[index].function.limits.logs;
                merged_seq_limits.memory = merged_seq_limits.memory >= tmp_to_merge[index].function.limits.memory ? merged_seq_limits.memory:tmp_to_merge[index].function.limits.memory
                merged_seq_limits.timeout = merged_seq_limits.timeout >= tmp_to_merge[index].function.limits.timeout ? merged_seq_limits.timeout:tmp_to_merge[index].function.limits.timeout

            }

            var funcs = [];
            tmp_to_merge.forEach(fm=>{
                // SOLO PER OTTENERE L'ARRAY, NON HA VERA UTILITA
                funcs.push(fm.function);
            });

            if (counter == funcs.length -1) { //DA CAMBIARE

                // le functions hanno tutte le stessa Kind (linguaggio) posso fonderle come plain text
                if (binary_count > 0) {
                    // almeno una binaria 
                    utils.mergeFuncsBinarySameLangCB(funcs, sequenceName,binaries_timestamp, function (timestamp_folder) {
                        zipgest.zipDirLocalCB("binaries/" + timestamp_folder, (file) => {
                            fg.deleteActionCB(sequenceName, function (data) {
                                fg.createActionCB(sequenceName, file, prevKind,"binary",merged_seq_limits, function (result) {
                                    zipgest.cleanDirs("/binaries/" + timestamp_folder);
                                    zipgest.cleanDirs("/binaries/" + timestamp_folder + ".zip");
                                    res.json(result);
                                });
                            })
                        })
                    })

                } else {
                    // solo plain text
                    utils.mergePlainTextFuncs(funcs, function (wrappedFunc) {
                        fg.deleteActionCB(sequenceName, function (data) {
                            fg.createActionCB(sequenceName, wrappedFunc, prevKind,"plain",merged_seq_limits, function (result) {
                                res.json(result);
                            });
                        });
                    });
                }
                    
            } else {

                //le functions non hanno tutte le stessa Kind (linguaggio) devo fonderle come binary ( zip file )
                //LA FUNZIONE FA IL MERGE DI FUNZIONI DI LUNGUAGGIO DIVERSO MA NON DI FUNZIONI 
                //PLAIN TEXT CON FUNZIONI BINARIE

                utils.mergeFuncsDiffLangPlainTextBinary(funcs, sequenceName,binaries_timestamp, function (timestamp_folder) {
                    zipgest.zipDirLocalCB("binaries/" + timestamp_folder, (file) => {
                        fg.deleteActionCB(sequenceName, function (data) {
                            fg.createActionCB(sequenceName, file,"nodejs:default" ,"binary",merged_seq_limits, function (result) {
                
                                zipgest.cleanDirs("/binaries/" + timestamp_folder);
                                zipgest.cleanDirs("/binaries/" + timestamp_folder + ".zip");
                                res.json(result);
                            });
                        })
                    })
                });       
                
            }
        })
    })
    .catch(err => {
        logger.log(err, "WARN")
        res.json(err);
    });
});

app.post("/api/v1/action/optimize", async (req, res) => {

    logger.log("/api/v1/action/optimize", "info");
    var funcs = [];
    const sequenceName = req.body.name;
    const binaries_timestamp = Date.now();
    var period = null;

    if (Object.keys(req.body).includes("period")) {
        period = "/" + req.body.period + "/";
    }

    const result = await fg.getAction(sequenceName);
    var promises = [];

    if (Object.keys(result).includes("error")) {
        logger.log("Error getting sequence: " + sequenceName, "warn");
        logger.log(JSON.stringify(result), "warn");
        res.json(result);
        return;
    };

    if(!Object.keys(result).includes("exec")){
        logger.log("Error getting sequence: " + sequenceName, "warn");
        logger.log(JSON.stringify(result), "warn");
        res.json(result);
        return;
    }

    if(!Object.keys(result.exec).includes("components")){
        res.json("Seems like the provided function is not a sequence");
        return;
    }

    result.exec.components.forEach(funcName => {

        var tmp = funcName.split('/');
        promises.push(

            fg.getAction(tmp[tmp.length - 1])
                .then((result) => {

                    if (Object.keys(result.exec).includes("components")) {

                        return 0;
                    }

                    const timestamp = Date.now();
                    var parsed = fg.parseFunction(result, timestamp,binaries_timestamp);
                    return parsed;

                }).catch((error) => {
                    logger.log(error, "error");
                    res.json(error);
                    return -1;
                })
        );
    });

    Promise.all(promises).then((result) => {
        result.forEach((r) => {
            funcs.push({ "function": r, "metrics": {}, "to_merge": false })
        })
    }).then(async () => {

        if (funcs.length < 2) {
            res.json({ mex: "An error occurred parsing functions, check if provided function is a sequence" });
            return;
        }

        let sub_seq_detected = false;
        let i = 0;
        for (i; i < funcs.length - 1; i++) {
            if (funcs[i].function == 0) {
                sub_seq_detected = true;
                break;
            }
        }

        if (sub_seq_detected) {
            logger.log("Sub-sequence detected", "info")
            res.json({ mex: "Sub-sequence detected, atm is not possible to optimizer sequence containing sub sequences!" })
            return;
        }

        const funcWithMetrics = funcs.map(async func => {

            if (period === null) period = '1d';
            const metricsRaw = await fg.getMetricsByFuncNameAndPeriod(func.function.name,period);
            func.metrics = metricsRaw;
            return func;

        })
        const resolvedfuncWithMetrics = await Promise.all(funcWithMetrics);

        utils.applyMergePolicies(resolvedfuncWithMetrics, async function (tmp_to_merge) {

            /**
             * CICLO PER VERIFICARE SE IL MERGE SARA TOTALE O PARZIALE
             */

            const sub_seq_array = utils.checkPartialMerges(tmp_to_merge);

            if(sub_seq_array.length === tmp_to_merge.length){
                res.json("The sequence provided doesn't need to be optimized")
            }

            if(sub_seq_array.length == 1){
                await merge(sub_seq_array[0],sequenceName,true)
                res.json("Sequence successfully merged!!")
                return;
            }else{

                var prom = []
                sub_seq_array.forEach(sub_seq => {
                    if(sub_seq.length > 1){
                        prom.push(
                            merge(sub_seq,sequenceName,false)
                        )
                    }else{
                        prom.push([sub_seq[0].function.name,sub_seq[0].function.limits])
                    }
                });

                const resolve_sub_seq_array_parsed = await Promise.all(prom);

                var final_limit = resolve_sub_seq_array_parsed[0][1];
                var seq_names_array = [];
                seq_names_array.push("/_/" + resolve_sub_seq_array_parsed[0][0]);
                for (let l = 1; l < resolve_sub_seq_array_parsed.length -1; l++) {
                    const limit = resolve_sub_seq_array_parsed[l][1];
                    seq_names_array.push("/_/" + resolve_sub_seq_array_parsed[l][0])
                    final_limit.concurrency = final_limit.concurrency >= limit.concurrency ? 
                    final_limit.concurrency:limit.concurrency

                    final_limit.logs = final_limit.logs >= limit.logs ? 
                    final_limit.logs:limit.logs;

                    final_limit.memory = final_limit.memory >= limit.memory ? 
                    final_limit.memory:limit.memory;

                    final_limit.timeout = final_limit.timeout >= limit.timeout ? 
                    final_limit.timeout:limit.timeout;   
                }

                fg.deleteActionCB(sequenceName, function (data) {
                    //CREA LA NUOVA SEQUENZA
                    fg.createActionCB(sequenceName, seq_names_array,"sequence", "sequence", final_limit,function (last_result) {
                        res.json({ "mex": "Functions partially merged","composition":last_result});
                    });
                })
            }  
        })     
    })
    .catch(err => {
        logger.log(err, "WARN")
        res.json(err);
    }); 
});

/*
async function mergeOld(tmp_to_merge,seq_name,whole){
    

    if(!whole) seq_name = seq_name+"-part"+Date.now();

    var counter = 0;
    const prevKind = tmp_to_merge[0].function.kind;
    var merged_seq_limits = tmp_to_merge[0].function.limits
    var binary_count = tmp_to_merge[0].function.binary ? 1:0;

    if(tmp_to_merge.length <=1){
        return [seq_name,merged_seq_limits];
    }

    for (let index = 1; index < tmp_to_merge.length; index++) {

        //COUNTER PER DETERMINARE SE TUTTE LE ACTION HANNO LO STESSO LINGUAGGIO
        if (tmp_to_merge[index].function.kind.split(":")[0] === prevKind.split(":")[0]) {
            counter++;
        }

        //COUNTER PER DETERMINARE SE E QUANTE FUNZIONI BINARIE CI SONO
        if (tmp_to_merge[index].function.binary) {
            binary_count++;
        }

        //CALCOLO DEI LIMITI PER LA NUOVA FUNZIONE MERGED
        merged_seq_limits.concurrency = merged_seq_limits.concurrency >= tmp_to_merge[index].function.limits.concurrency ? 
        merged_seq_limits.concurrency:tmp_to_merge[index].function.limits.concurrency

        merged_seq_limits.logs = merged_seq_limits.logs >= tmp_to_merge[index].function.limits.logs ? 
        merged_seq_limits.logs:tmp_to_merge[index].function.limits.logs;

        merged_seq_limits.memory = merged_seq_limits.memory >= tmp_to_merge[index].function.limits.memory ? 
        merged_seq_limits.memory:tmp_to_merge[index].function.limits.memory;

        merged_seq_limits.timeout = merged_seq_limits.timeout >= tmp_to_merge[index].function.limits.timeout ? 
        merged_seq_limits.timeout:tmp_to_merge[index].function.limits.timeout;

    }

    var funcs = [];
    tmp_to_merge.forEach(fm=>{
        funcs.push(fm.function);
    });

    if (counter == funcs.length -1) { 

        // le functions hanno tutte le stessa Kind (linguaggio) posso fonderle come plain text
        if (binary_count > 0) {
            // almeno una binaria 
            utils.mergeFuncsBinarySameLangCB(funcs, seq_name,binaries_timestamp, function (timestamp_folder) {
                zipgest.zipDirLocalCB("binaries/" + timestamp_folder, (file) => {
                    const size = zipgest.getFileSize("binaries/" + timestamp_folder+ ".zip");

                    fg.createActionCB(seq_name, file, prevKind,"binary",merged_seq_limits, function (result) {
                        zipgest.cleanDirs("/binaries/" + timestamp_folder);
                        zipgest.cleanDirs("/binaries/" + timestamp_folder + ".zip");
                        return [seq_name,merged_seq_limits];
                    });
                })
            })

        } else {
            // solo plain text
            utils.mergePlainTextFuncs(funcs, function (wrappedFunc) {
                if(whole){
                    fg.deleteActionCB(seq_name, function (data) {
                        fg.createActionCB(seq_name, wrappedFunc, prevKind,"plain",merged_seq_limits, function (result) {
                            return [seq_name,merged_seq_limits];
                        });
                    });
                }else{
                    fg.createActionCB(seq_name, wrappedFunc, prevKind,"plain",merged_seq_limits, function (result) {
                        return [seq_name,merged_seq_limits];
                    });  
                }         
            });
        }        
    } else {

        //le functions non hanno tutte le stessa Kind (linguaggio) devo fonderle come binary ( zip file )
        //LA FUNZIONE FA IL MERGE DI FUNZIONI DI LUNGUAGGIO DIVERSO MA NON DI FUNZIONI 
        //PLAIN TEXT CON FUNZIONI BINARIE

        utils.mergeFuncsDiffLangPlainTextBinary(funcs, seq_name,binaries_timestamp, function (timestamp_folder) {
            zipgest.zipDirLocalCB("binaries/" + timestamp_folder, (file) => {
                const size = zipgest.getFileSize("binaries/" + timestamp_folder+ ".zip");
                if(whole){
                    fg.deleteActionCB(seq_name, function (data) {
                        fg.createActionCB(seq_name, file,"nodejs:default" ,"binary",merged_seq_limits, function (result) {
            
                            zipgest.cleanDirs("/binaries/" + timestamp_folder);
                            zipgest.cleanDirs("/binaries/" + timestamp_folder + ".zip");
                            return [seq_name,merged_seq_limits];
                        });
                    })
                }else{
                    fg.createActionCB(seq_name, file,"nodejs:default" ,"binary",merged_seq_limits, function (result) {
        
                        zipgest.cleanDirs("/binaries/" + timestamp_folder);
                        zipgest.cleanDirs("/binaries/" + timestamp_folder + ".zip");
                        return [seq_name,merged_seq_limits];
                    }); 
                }
                
            })
        });       
        
    }
}*/

app.get("/api/v1/action/list", (req, res) => {

    fg.listActionsCB(function(result){
        if(result.length < 1){
            res.json({"mex":"No actions found"})
        }else{
            res.json(result);

        }
    })

});

app.post("/api/v1/action/invoke", async (req, res) => {

    var blocking = false;
    const params = req.body.params;
    if(Object.keys(req.body).includes("blocking")){
        if(req.body.blocking) blocking = true;
    }

    fg.invokeActionWithParams(req.body.name,params,blocking).then((result)=>{
        res.json(result);
    });
});

app.post("/api/v1/action/get", (req, res) => {

    logger.log("/api/v1/action/get", "info");

    fg.getAction(req.body.name).then((result)=>{
        res.json(result);
    });
});

app.post("/api/v1/action/delete", (req, res) => {

    logger.log("/api/v1/action/delete", "info");
    fg.deleteActionCB(req.body.name,function(result) {
        res.json(result);
    });
});

app.post("/api/v1/action/create", (req, res) => {

    fg.createActionCB(req.body.name, req.body.fbody, req.body.fkind,"",{}, function (content) {
        res.json(content);
    });

});

app.post("/api/v1/metrics/get", async (req, res) => {

    logger.log("/api/v1/metrics/get", "info");
    let p = req.body.period;
    if (p === null || p === undefined) p = "1d";
    const response = await fg.getMetricsByFuncNameAndPeriod(req.body.name, p);

    response.duration = response.duration + " ms";
    response.waitTime = response.waitTime + " ms";
    response.initTime = response.initTime + " ms";
    res.json(response);

});


/**
 * FUNZIONE CHE PRENDE UN ARRAY DI ACTION E NE FA IL MERGE  
 */

 async function merge(tmp_to_merge,seq_name,whole){
    return new Promise(function(resolve, reject) {

        if(!whole) seq_name = seq_name+"-part"+Date.now();

        var counter = 0;
        const prevKind = tmp_to_merge[0].function.kind;
        var merged_seq_limits = tmp_to_merge[0].function.limits
        var binary_count = tmp_to_merge[0].function.binary ? 1:0;

        if(tmp_to_merge.length <=1){
            resolve( [seq_name,merged_seq_limits]);
        }

        for (let index = 1; index < tmp_to_merge.length; index++) {

            //COUNTER PER DETERMINARE SE TUTTE LE ACTION HANNO LO STESSO LINGUAGGIO
            if (tmp_to_merge[index].function.kind.split(":")[0] === prevKind.split(":")[0]) {
                counter++;
            }

            //COUNTER PER DETERMINARE SE E QUANTE FUNZIONI BINARIE CI SONO
            if (tmp_to_merge[index].function.binary) {
                binary_count++;
            }

            //CALCOLO DEI LIMITI PER LA NUOVA FUNZIONE MERGED
            merged_seq_limits.concurrency = merged_seq_limits.concurrency >= tmp_to_merge[index].function.limits.concurrency ? 
            merged_seq_limits.concurrency:tmp_to_merge[index].function.limits.concurrency

            merged_seq_limits.logs = merged_seq_limits.logs >= tmp_to_merge[index].function.limits.logs ? 
            merged_seq_limits.logs:tmp_to_merge[index].function.limits.logs;

            merged_seq_limits.memory = merged_seq_limits.memory >= tmp_to_merge[index].function.limits.memory ? 
            merged_seq_limits.memory:tmp_to_merge[index].function.limits.memory;

            merged_seq_limits.timeout = merged_seq_limits.timeout >= tmp_to_merge[index].function.limits.timeout ? 
            merged_seq_limits.timeout:tmp_to_merge[index].function.limits.timeout;

        }

        var funcs = [];
        tmp_to_merge.forEach(fm=>{
            funcs.push(fm.function);
        });

        if (counter == funcs.length -1) { 

            // le functions hanno tutte le stessa Kind (linguaggio) posso fonderle come plain text
            if (binary_count > 0) {
                // almeno una binaria 
                utils.mergeFuncsBinarySameLangCB(funcs, seq_name,binaries_timestamp, function (timestamp_folder) {
                    zipgest.zipDirLocalCB("binaries/" + timestamp_folder, (file) => {
                        const size = zipgest.getFileSize("binaries/" + timestamp_folder+ ".zip");

                        fg.createActionCB(seq_name, file, prevKind,"binary",merged_seq_limits, function (result) {
                            zipgest.cleanDirs("/binaries/" + timestamp_folder);
                            zipgest.cleanDirs("/binaries/" + timestamp_folder + ".zip");
                            resolve( [seq_name,merged_seq_limits]);
                        });
                    })
                })

            } else {
                // solo plain text
                utils.mergePlainTextFuncs(funcs, function (wrappedFunc) {
                    if(whole){
                        fg.deleteActionCB(seq_name, function (data) {
                            fg.createActionCB(seq_name, wrappedFunc, prevKind,"plain",merged_seq_limits, function (result) {
                                resolve( [seq_name,merged_seq_limits]);
                            });
                        });
                    }else{
                        fg.createActionCB(seq_name, wrappedFunc, prevKind,"plain",merged_seq_limits, function (result) {
                            resolve( [seq_name,merged_seq_limits]);
                        });  
                    }         
                });
            }        
        } else {

            //le functions non hanno tutte le stessa Kind (linguaggio) devo fonderle come binary ( zip file )
            //LA FUNZIONE FA IL MERGE DI FUNZIONI DI LUNGUAGGIO DIVERSO MA NON DI FUNZIONI 
            //PLAIN TEXT CON FUNZIONI BINARIE

            utils.mergeFuncsDiffLangPlainTextBinary(funcs, seq_name,binaries_timestamp, function (timestamp_folder) {
                zipgest.zipDirLocalCB("binaries/" + timestamp_folder, (file) => {
                    const size = zipgest.getFileSize("binaries/" + timestamp_folder+ ".zip");
                    if(whole){
                        fg.deleteActionCB(seq_name, function (data) {
                            fg.createActionCB(seq_name, file,"nodejs:default" ,"binary",merged_seq_limits, function (result) {
                
                                zipgest.cleanDirs("/binaries/" + timestamp_folder);
                                zipgest.cleanDirs("/binaries/" + timestamp_folder + ".zip");
                                resolve( [seq_name,merged_seq_limits]);
                            });
                        })
                    }else{
                        fg.createActionCB(seq_name, file,"nodejs:default" ,"binary",merged_seq_limits, function (result) {
            
                            zipgest.cleanDirs("/binaries/" + timestamp_folder);
                            zipgest.cleanDirs("/binaries/" + timestamp_folder + ".zip");
                            resolve( [seq_name,merged_seq_limits]);
                        }); 
                    }
                    
                })
            });       
            
        }
    });
}

export default app;