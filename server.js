const app = require("./src/app.js");
const conf = require("./config/conf");
const logger = require("./src/utils/logger.js");


app.listen(conf.PORT,()=>{
    logger.log("Listening on port "+ conf.PORT,"info");
});


