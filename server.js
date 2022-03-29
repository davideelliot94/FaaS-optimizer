const conf = require("./config/conf");
const logger = require("./src/utils/logger.js");
let reqApp;
conf.AMBIENT == "openwhisk" ? reqApp = "./src/app.js": reqApp = "./src/appl.js";

import app from reqApp;
import * as conf from "./config/conf.cjs";
import * as logger from "./src/utils/logger.cjs";




app.listen(conf.PORT,()=>{
    logger.log("Listening on port "+ conf.PORT,"info");
});


