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

/** ROUTES  */

app.get("/", (req, res) => {
    res.json({ "response": "Service up and running!" });
});

app.post("/api/v1/action/merge", (req, res) => {

    logger.log("/api/v1/action/merge", "info");
    var funcs = [];
    const sequenceName = req.body.name;
    const binaries_timestamp = Date.now()

    fg.getAction(sequenceName).then((result) => {
        var promises = [];

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
            var binary_count = 0;
            for (let index = 1; index < funcs.length; index++) {
                if (funcs[index].kind === prevKind) {
                    counter++;
                }
                if (funcs[index].binary) {
                    binary_count++;
                }
            }

            if (counter == funcs.length - 1) {

                // Le functions hanno tutte le stessa kind
                if (binary_count > 0) {
                    // almeno una binaria 

                    utils.mergeFuncsBinarySameLangCB(funcs, sequenceName,binaries_timestamp, function (timestamp_folder) {
                        zipgest.zipDirLocalCB("binaries/" + timestamp_folder, (file) => {
                            fg.deleteActionCB(sequenceName, function () {
                                fg.createActionCB(sequenceName, file, prevKind,"binary", function (result) {
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
                        fg.deleteActionCB(sequenceName, function () {
                            fg.createActionCB(sequenceName, wrappedFunc, prevKind,"plain", function (result) {
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
                        fg.deleteActionCB(sequenceName, function () {
                            fg.createActionCB(sequenceName, file,"nodejs:default" ,"binary", function (result) {
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

app.post("/api/v1/action/optimize", async (req, res) => {

    logger.log("/api/v1/action/optimize", "info");
    var funcs = [];
    const sequenceName = req.body.name;
    var period = null;

    if (Object.keys(req.body).includes("period")) {
        period = "/" + req.body.period + "/";
    }

    var sequencePart = sequenceName + "-part";

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
                    sequencePart = sequencePart + timestamp;
                    var parsed = fg.parseFunction(result, timestamp);
                    if (parsed.binary) {
                        zipgest.cleanDirs("/zip_workdir/extracted/" + timestamp);
                        zipgest.cleanDirs("/zip_workdir/zipped/" + timestamp);
                    }
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

        utils.checkToMerge(resolvedfuncWithMetrics, function (func_to_merge) {

            var to_m_count = 0;
            var tmp_to_merge = [];
            var func_not_merged = [];
            func_to_merge.forEach(fm => {
                if (fm.to_merge) {
                    tmp_to_merge.push(fm);
                    func_not_merged.push("");
                    to_m_count++;
                } else {
                    func_not_merged.push(fm)
                }

            })

            if (to_m_count <= 1) {
                logger.log("Apparently sequence " + sequenceName + " doesn't need to be optimized", "info");
                res.json("Apparently sequence " + sequenceName + " doesn't need to be optimized");
                return;
            }

            var counter = 1;
            const prevKind = tmp_to_merge[0].function.kind;
            for (let index = 1; index < tmp_to_merge.length; index++) {
                if (tmp_to_merge[index].function.kind === prevKind) {
                    counter++;
                }
            }

            var part_merge = false;
            if (to_m_count != funcs.length) {
                part_merge = true;
            }

            if (counter == to_m_count) {

                // le functions hanno tutte le stessa Kind (linguaggio) posso fonderle come plain text

                utils.mergeFuncsWithMetrics(func_to_merge, sequenceName, false,true, function (wrappedFunc) {
                    fg.deleteActionCB(sequenceName, function () {
                        fg.createActionCB(part_merge ? sequencePart : sequenceName, wrappedFunc, prevKind, function (result) {
                            if (part_merge) {
                                /**
                                 * 
                                 * E SE CI FOSSERO PIU MERGE PARZIALI NECESSARI? 
                                 */
                                var last_funcs = []
                                let barrier = false;
                                func_not_merged.forEach(nmf => {
                                    if (nmf === "" && barrier == false) {
                                        last_funcs.push("/_/" + sequencePart);
                                        barrier = true
                                    } else {
                                        last_funcs.push("/_/" + nmf.function.name);
                                    }
                                })
                                /*
                                func_to_merge.forEach(fm =>{
                                    if(!fm.to_merge) last_funcs.push("/_/"+fm.function.name);
                                })*/

                                fg.createActionCB(sequenceName, last_funcs, "sequence", function (last_result) {
                                    res.json({ "mex": "Functions partially merged", "function": last_result, "partial_function": result });
                                });
                            } else {
                                res.json(result);
                            }
                        });
                    });
                });
            } else {

                //le functions non hanno tutte le stessa Kind (linguaggio) devo fonderle come binary ( zip file )

                utils.mergeFuncsWithMetrics(func_to_merge, sequenceName, true,false, function (timestamp_folder) {
                    zipgest.zipDirLocalCB("binaries/" + timestamp_folder, (file) => {
                        fg.deleteActionCB(sequenceName, function () {
                            fg.createActionCB(part_merge ? sequencePart : sequenceName, file, "nodejs:default", function (result) {
                                zipgest.cleanDirs("/binaries/" + timestamp_folder);
                                if (part_merge) {
                                    var last_funcs = []
                                    let barrier = false;
                                    func_not_merged.forEach(nmf => {
                                        if (nmf === "" && barrier == false) {
                                            last_funcs.push("/_/" + sequencePart);
                                            barrier = true
                                        } else {
                                            last_funcs.push("/_/" + nmf.function.name);
                                        }
                                    })
                                    /*
                                    var last_funcs = []
                                    last_funcs.push(sequencePart);
    
    
                                    func_to_merge.forEach(fm =>{
                                        if(!fm.to_merge) last_funcs.push("/_/"+fm.function.name);                                            
                                    })*/
                                    fg.createActionCB(sequenceName, last_funcs, "sequence", function (last_result) {
                                        res.json({ "mex": "Functions partially merged", "function": last_result, "partial_function": result });
                                    });
                                } else {
                                    res.json(result);
                                }
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


app.get("/api/v1/action/list", (req, res) => {

    try {
        fetch('https://' + conf.API_HOST + '/api/v1/namespaces/_/actions', {
            headers: {
                'Authorization': 'Basic ' + btoa(conf.API_KEY)
            },
            agent: httpsAgent
        })
            .then(response => response.json())
            .then(data => {
                res.json(data);
                logger.log("/api/v1/action/list" + data, "info")
            }).catch(err => {
                logger.log(err, "WARN")
                res.json(err);
            });
    } catch (error) {
        logger.log(error, "error")
        res.json(error);
    }

});

app.post("/api/v1/action/invoke", (req, res) => {

    const funcName = req.body.name;
    logger.log("/api/v1/action/invoke", "info");
    try {
        fetch('https://' + conf.API_HOST + '/api/v1/namespaces/_/actions/' + req.body.name + '?blocking=true', {
            method: 'POST',
            headers: {
                'Authorization': 'Basic ' + btoa(conf.API_KEY)
            },
            agent: httpsAgent
        })
            .then(response => response.json())
            .then(data => {
                logger.log("/api/v1/action/invoke" + JSON.stringify(data), "info");
                res.json({ mex: data });
            }).catch(err => {
                logger.log(err, "WARN")
                res.json(err);
            });
    } catch (error) {
        logger.log(error, "error")
        res.json(error);
    }
});

app.post("/api/v1/action/invoke-with-params", async (req, res) => {

    logger.log("/api/v1/action/invoke-with-params", "info");
    try {
        (async () => {
            const rawResponse = await fetch('https://' + conf.API_HOST + '/api/v1/namespaces/_/actions/' + req.body.name + '?blocking=true', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Authorization': 'Basic ' + btoa(conf.API_KEY)
                },
                agent: httpsAgent,
                body: JSON.stringify(req.body.params)
            }).catch(err => {
                logger.log(err, "WARN")
                res.json(err);
            });
            const content = await rawResponse.json();
            logger.log("/api/v1/action/invoke-with-params " + JSON.stringify(content), "info");
            res.json(content);
        })()
    } catch (error) {
        logger.log(error, "error")
        res.json(error);
    }

});

app.post("/api/v1/action/get", (req, res) => {

    logger.log("/api/v1/action/get", "info");
    try {
        fetch('https://' + conf.API_HOST + '/api/v1/namespaces/_/actions/' + req.body.name + '?blocking=true', {
            method: 'GET',
            headers: {
                'Authorization': 'Basic ' + btoa(conf.API_KEY)
            },
            agent: httpsAgent
        })
            .then(response => response.json())
            .then(data => {
                res.json(data);
                logger.log("/api/v1/action/get " + data, "info")
            }).catch(err => {
                logger.log(err, "WARN")
                res.json(err);
            });
    } catch (error) {
        logger.log(error, "error")
        res.json(error);
    }
});

app.post("/api/v1/action/delete", (req, res) => {

    logger.log("/api/v1/action/delete", "info");

    try {
        fetch('https://' + conf.API_HOST + '/api/v1/namespaces/_/actions/' + req.body.name, {
            method: 'DELETE',
            headers: {
                'Authorization': 'Basic ' + btoa(conf.API_KEY)
            },
            agent: httpsAgent
        })
            .then(response => response.json())
            .then(data => {
                res.json(data);
                logger.log("/api/v1/action/delete " + data, "info")
            }).catch(err => {
                logger.log(err, "WARN")
                res.json(err);
            });
    } catch (error) {
        logger.log(error, "error")
        res.json(error);
    }
});

app.post("/api/v1/action/create", (req, res) => {

    fg.createActionCB(req.body.name, req.body.fbody, req.body.fkind, function (content) {
        res.json(content);
    })

});

app.post("/api/v1/metrics/get", async (req, res) => {

    logger.log("/api/v1/metrics/get", "info");
    const p = req.body.period;

    if (p !== null && p !== undefined) {
        fg.getMetricsByFuncNameAndPeriodCB(req.body.name, p, function (response) {
            response.duration = response.duration + " ms";
            response.waitTime = response.waitTime + " ms";
            response.initTime = response.initTime + " ms";
            res.json(response);
        });
    } else {
        fg.getMetricsByFuncNameCB(req.body.name, function (response) {
            response.duration = response.duration + " ms";
            response.waitTime = response.waitTime + " ms";
            response.initTime = response.initTime + " ms";
            res.json(response);
        });
    }

});


function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}




export default app;