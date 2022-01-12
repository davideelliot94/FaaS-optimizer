const config = require('config');

const PORT = config.get('default.port');
const API_HOST =config.get('openwhisk.apihost')+":"+config.get('openwhisk.port');
const API_KEY=config.get('openwhisk.apikey');

module.exports =  {API_HOST,API_KEY,PORT}