//const fs = require("fs");
import * as fs from 'fs';
import path from "path";
//const utils = require("./utils/utils");
import * as utils from "./utils/utils.cjs";
//const fg = require("./owinteractions/funcGestures");
import * as fg from "./owinteractions/funcGestures.js";
//const zipgest = require("./utils/zipGestures.cjs");
import * as zipgest from "./utils/zipGestures.cjs";
//const logger = require("./utils/logger.cjs");
import * as logger from "./utils/logger.cjs";

//const express = require("express");
import express from 'express';
const app = express();
app.use(express.json());
export default app;


app.get("/",(req,res)=>{
    res.json({"mex":"Service up and running!"});
})

app.post("/api/v1/action/merge", async (req, res) => {
    
    logger.log("/api/v1/action/merge","info");
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
        if (result.toString().includes("OpenWhiskError")) {
            res.json({ mex: result });
            return;
        };
        result.exec.components.forEach(funcName => {
            promises.push(

                fg.getAction(funcName)
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
            
            var wrappedFunc = utils.mergeFuncs(funcs, sequenceName);
            /*
                BISOGNA INVOCARE LA SEQUENZA APPENA FATTA E PRENDERNE LE METRICHE PER VEDERE SE IL MERGE È STATO EFFICACE
                SE SI POSSO CREARE LA NUOVA FUNZIONE


                POSSO EVITARE LA DELETE E FARE LA CREATE CON OVERWRITE == TRUE??
            */
            fg.deleteAction(sequenceName).then(()=>{
                fg.createAction(sequenceName,wrappedFunc).then(()=>{
                    res.json({ mex: wrappedFunc });
                }).catch(()=>{
                    res.json({ mex: "An error occurred while creating new action" });
                })    
            }).catch(()=>{
                res.json({ mex: "An error occurred while deleting old sequence action" });
            });

        });
    });
});
/*
app.post("/api/v1/listFields", (req, res) => {

    var keys = utils.getBodyFields(req.body);
    keys.forEach(element => {
        console.log(element);
    });

    res.json({ mex: "END" });
});*/

app.get("/api/v1/action/list", (req, res) => {

    fg.listAction().then((result) => {
        res.json({ mex: result });
    });

});

app.post("/api/v1/action/invoke", (req, res) => {

    const funcName = req.body.name;
    logger.log("/api/v1/action/invoke","info");
    fg.invokeAction(funcName).then((result) => {
        res.json({ mex: result });
    });

});

app.post("/api/v1/action/invoke-with-params", (req, res) => {

    const funcName = req.body.name;
    logger.log("/api/v1/action/invoke","info");

    fg.invokeActionWithParams(funcName,req.body.params).then((result) => {
        res.json({ mex: result });
    });

});

app.post("/api/v1/action/get", (req, res) => {

    logger.log("/api/v1/action/get","info");
    const funcName = req.body.name;
    fg.getAction(funcName).then((result) => {
        res.json({ mex: result });
    });

});

app.post("/api/v1/action/delete", (req, res) => {

    const funcName = req.body.name;
    logger.log("/api/v1/action/delete","info");
    fg.deleteAction(funcName).then((result) => {
        res.json({ mex: result });
    });

});

app.post("/api/v1/action/create", (req, res) => {

    logger.log("/api/v1/action/create","info");
    const funcName = req.body.name;
    const funcBody = req.body.fbody;
    
    fg.createAction(funcName, funcBody).then((result) => {
        res.json({ mex: result });
    });

});

function parseFunction(element,timestamp){

    logger.log("Parsing function","info");

    if (element.exec.binary) {

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
}

