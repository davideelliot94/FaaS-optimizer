const config = require('config');
const https = require('https');
const PORT = config.get('default.port');
//const API_HOST =config.get('openwhisk.apihost')+":"+config.get('openwhisk.port');
//const API_HOST = process.env.API_HOST;
const API_HOST = process.env.API_HOST != undefined ? process.env.API_HOST:config.get('openwhisk.apihost')+":"+config.get('openwhisk.port');
const METRICS_ENDPOINT = process.env.METRICS_ENDPOINT != undefined ? process.env.METRICS_ENDPOINT:"";
const AMBIENT = process.env.AMBIENT != undefined ? process.env.AMBIENT : "undetected environment";
const metrics = config.get('openwhisk.metrics');
const kinds = config.get('openwhisk.kinds');
const API_KEY=config.get('openwhisk.apikey');
const packagejson = config.get('openwhisk.binary.packagejson');
const httpsAgent = new https.Agent({
    rejectUnauthorized: false,
    });
module.exports =  {API_HOST,API_KEY,PORT,httpsAgent,AMBIENT,kinds,packagejson,METRICS_ENDPOINT,metrics}