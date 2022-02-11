//const app = require("./src/app.js");
//const app2 = require("./src/app_2.cjs");
//const conf = require("./config/conf.cjs");
//const logger = require("./src/utils/logger.cjs");
import app from "./src/app.js";
import app2 from "./src/app_2.js";
import * as conf from "./config/conf.cjs";
import * as logger from "./src/utils/logger.cjs";

/*
app.listen(conf.PORT,()=>{
    logger.log("Listening on port "+ conf.PORT,"info");
});*/

app2.listen(conf.PORT,()=>{
    logger.log("Listening on port "+ conf.PORT,"info");
});

//whisk auth		23bc46b1-71f6-4ed5-8c54-816aa4f8c502:123zO3xZCLrMN6v2BKK1dXYFpXlPkccOFqm12CdAsMgRU4VrNZ9lyGVCGuMDGIwP


