import app from "./src/app.js";
import * as conf from "./config/conf.cjs";
import * as logger from "./src/log/logger.cjs";


app.listen(conf.PORT,()=>{
    logger.log("Running on "+ conf.AMBIENT,"info");
    logger.log("HOST: "+conf.API_HOST,"info");
    logger.log("METRICS_ENDPOINT: "+conf.METRICS_ENDPOINT,"info");
    logger.log("Listening on port "+ conf.PORT,"info");
});