const config = require('config');
const https = require('https');

const httpsAgent = new https.Agent({rejectUnauthorized: false});

const PORT = config.get('default.port');
const API_HOST = process.env.API_HOST != undefined ? process.env.API_HOST:config.get('openwhisk.apihost')+":"+config.get('openwhisk.port');
const METRICS_ENDPOINT = process.env.METRICS_ENDPOINT != undefined ? process.env.METRICS_ENDPOINT:" not defined";
const ENVIRONMENT = process.env.ENVIRONMENT != undefined ? process.env.ENVIRONMENT : "standalone environment";
const METRICS = config.get('openwhisk.metrics');
const KINDS = config.get('openwhisk.kinds');
const API_KEY=config.get('openwhisk.apikey');
const LIMITS = config.get("openwhisk.system.limits") != undefined ? config.get("openwhisk.system.limits"):{} ;
const IS_SIMULATION = config.get("simulation")!= undefined ? config.get("simulation"):false;
const KAFKA_TOPIC = config.get("kafka.topic") != undefined ? config.get("kafka.topic"):"TEST";
const KAFKA_BOOTSTRAP_SERVER = config.get("kafka.boostrap_server")

module.exports =  
                {
                    API_HOST,
                    API_KEY,
                    PORT,
                    httpsAgent,
                    ENVIRONMENT,
                    KINDS,
                    METRICS_ENDPOINT,
                    METRICS,
                    LIMITS,
                    IS_SIMULATION,
                    KAFKA_TOPIC,
                    KAFKA_BOOTSTRAP_SERVER
                }