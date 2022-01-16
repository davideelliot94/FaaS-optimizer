const openwhisk = require('openwhisk');
const conf = require('../../config/conf');
const fs = require("fs");
const path = require('path');
const logger = require("../utils/logger")

//APIHOST VUOLE IP:PORT
//ANCORA NON HO CAPITO COME FARE CON LE KEY -> per questo "ignore_certs"
const options = {
	apihost: conf.API_HOST,
	api_key:conf.API_KEY,
    ignore_certs:true
}
const ow = openwhisk(options);

function invokeAction(funcName) {
	return new Promise((resolve, reject) => {
		ow.actions.invoke({name:funcName,blocking:true,result:true}).then((result)=>{
			resolve(result);
		}).catch((err) =>{
            resolve(err);
            logger.log(err,"error");
        });
	});
}

function invokeActionWithParams(funcName,params) {
    //mettere la specifica dei parametri
    logger.log(params,"info");

	return new Promise((resolve, reject) => {
		ow.actions.invoke({name:funcName,blocking:true,result:true,params}).then((result)=>{
			resolve(result);
		}).catch((err) =>{
            resolve(err);
            logger.log(err,"error");
        });
	});
}

function invokeActionWithParams(funcName,params) {
    //mettere la specifica dei parametri
    logger.log(params,"info");
    if(params != null && params != undefined){
        return new Promise((resolve, reject) => {
            ow.actions.invoke({name:funcName,blocking:true,result:false}).then((result)=>{
                resolve(result);
            }).catch((err) =>{
                resolve(err);
                logger.log(err,"error");
            });
        });
    }else{
        return new Promise((resolve, reject) => {
            ow.actions.invoke({name:funcName,blocking:true,result:false,params}).then((result)=>{
                resolve(result);
            }).catch((err) =>{
                resolve(err);
                logger.log(err,"error");
            });
        });
    }

	
}

function createAction(funcName,funcBody){
    logger.log("Creating action "+funcName,"info");
    return new Promise((resolve, reject) => {
		ow.actions.create({name:funcName,action:funcBody}).then((result)=>{
			resolve(result);
		}).catch((err) =>{
            resolve(err);
            logger.log(err,"error");
        });
	});
}

function deleteAction(funcName){
    logger.log("Deleting action "+funcName,"info");
    return new Promise((resolve, reject) => {
		ow.actions.delete({name:funcName}).then((result)=>{
			resolve(result);
		}).catch((err) =>{
            resolve(err);
            logger.log(err,"error");
        });
	});
}

function getAction(funcName){ 
    logger.log("Getting action "+funcName,"info");   
    return new Promise((resolve, reject) => {
		ow.actions.get({name:funcName}).then((result)=>{
			resolve(result);
		}).catch((err) =>{
            resolve(err);
            logger.log(err,"error");
        });
	});
}

function listAction(){
    logger.log("Listing actions","info");   

    return new Promise((resolve, reject) => {
		ow.actions.list().then((result)=>{
			resolve(result);
		}).catch((err) =>{
            resolve(err);
            logger.log(err,"error");
        });
    });
}

function getParamName(actioName){
    
    getAction(actionName).then((result)=>{

    }).catch((err)=>{
        logger.log("An error occured while getting parameters name","error");
        logger.log("Error specification: "+err,"error");
        throw err;
    })
}
/*
function parseFunction(element,timestamp){

    logger.log("Parsing actions from sequence","info");   


    if (element.exec.binary) {
        
        //let buff = Buffer.from(element.exec.code, 'base64');
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
*/
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
}

module.exports = {listAction,invokeAction,getAction,deleteAction,createAction,invokeActionWithParams,parseFunction};