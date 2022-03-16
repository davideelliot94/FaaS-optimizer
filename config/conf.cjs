const config = require('config');
const https = require('https');
const PORT = config.get('default.port');
const API_HOST =config.get('openwhisk.apihost')+":"+config.get('openwhisk.port');
const API_KEY=config.get('openwhisk.apikey');
const httpsAgent = new https.Agent({
    rejectUnauthorized: false,
    });
module.exports =  {API_HOST,API_KEY,PORT,httpsAgent}