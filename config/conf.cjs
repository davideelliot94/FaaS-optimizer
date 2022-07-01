const config = require('config');
const https = require('https');
const PORT = config.get('default.port');
const API_HOST = process.env.API_HOST != undefined ? process.env.API_HOST:config.get('openwhisk.apihost')+":"+config.get('openwhisk.port');
const METRICS_ENDPOINT = process.env.METRICS_ENDPOINT != undefined ? process.env.METRICS_ENDPOINT:" not defined";
const ENVIRONMENT = process.env.ENVIRONMENT != undefined ? process.env.ENVIRONMENT : "standalone environment";
const metrics = config.get('openwhisk.metrics');
const kinds = config.get('openwhisk.kinds');
const API_KEY=config.get('openwhisk.apikey');

const httpsAgent = new https.Agent({rejectUnauthorized: false});

module.exports =  {API_HOST,API_KEY,PORT,httpsAgent,ENVIRONMENT,kinds,METRICS_ENDPOINT,metrics,}