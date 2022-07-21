const { Kafka } = require('kafkajs')
const conf =  require("../../config/conf.cjs");

const { KAFKA_USERNAME: username, KAFKA_PASSWORD: password } = process.env
const sasl = username && password ? { username, password, mechanism: 'plain' } : null
const ssl = !!sasl

// This creates a client instance that is configured to connect to the Kafka broker provided by
// the environment variable KAFKA_BOOTSTRAP_SERVER
console.log("conf.KAFKA_BOOTSTRAP_SERVER")
console.log(conf.KAFKA_BOOTSTRAP_SERVER)
const kafka = new Kafka({
  clientId: 'faas-optimizer',
  brokers: [conf.KAFKA_BOOTSTRAP_SERVER],
  ssl,
  sasl
})

  
const producer = kafka.producer();
const admin = kafka.admin();


module.exports = {kafka,producer,admin}


//$KAFKA_HOME/bin/kafka-console-consumer.sh --bootstrap-server localhost:9092 --topic TEST >> output_1_1.txt
