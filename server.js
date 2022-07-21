import app from "./src/app.js";
import * as conf from "./config/conf.cjs";
import * as logger from "./src/log/logger.cjs";
import {producer,admin} from "./src/kafka/Kafka.cjs"


app.listen(conf.PORT, async ()=>{  
    
    if(conf.IS_SIMULATION){
        const topic = conf.KAFKA_TOPIC;
        try {
            await admin.connect()
            await admin.createTopics({
            topics: [{ topic }],
            waitForLeaders: true,
            })
            await producer.connect()  
        } catch (error) {
            console.error(error)
            process.exit(1)
        }
        //doTestKafka()
    }
    
    

    logger.log("Running on "+ conf.ENVIRONMENT,"info");
    logger.log("HOST: "+conf.API_HOST,"info");
    logger.log("METRICS_ENDPOINT: "+conf.METRICS_ENDPOINT,"info");
    logger.log("Listening on port "+ conf.PORT,"info");
});

async function doTestKafka(){
  let x = 0;
    const mex = {
      "name":"test",
      "functions":[
        {"name":"F1","arrivalRate":3,"avgDuration":20,"memory":256},
        {"name":"F2","arrivalRate":3,"avgDuration":15,"memory":256},
        {"name":"F3","arrivalRate":3,"avgDuration":10,"memory":256},
        {"name":"F4","arrivalRate":3,"avgDuration":15,"memory":256},
        {"name":"F5","arrivalRate":3,"avgDuration":20,"memory":256}
	    ],
	    "funcsNumber":5,// int
      "condActionDuration":0.3, //double seqDuration+ seqWaitTime/seqLen
      "avgColdStartRate":0 ,// double
      "avgColdStartDuration":20,//double
      "stopTime":360, // int
      "cpus":4,//int
      "mem":8196, // int
      "num":1, //Int
      "maxParallelism":10,//Int
      "minParallelism":0 //Int
    }
    while (x < 1){
        try {
            const responses = await producer.send({
              topic: "TEST",
              messages: [{
                // Name of the published package as key, to make sure that we process events in order
                key: "config",
        
                // The message value is just bytes to Kafka, so we need to serialize our JavaScript
                // object to a JSON string. Other serialization methods like Avro are available.
                value: JSON.stringify({
                  package: mex,
                  version: 1
                })
              }]
            })
            x++;
            console.log('Published message', { responses })
          } catch (error) {
            console.error('Error publishing message', error)
          }
    }
}

//ANCORA NON HO CAPITO COME FARE CON LE KEY -> per questo "ignore_certs"
