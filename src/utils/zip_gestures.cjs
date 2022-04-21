const fs = require('fs');
const path = require("path");
const child_process = require("child_process");
const logger = require("../log/logger.cjs");


function extractZipLocal (timestamp) {

  logger.log("Extracting zip action in directory /zipped/"+timestamp,"info");
  const zipFile = path.join(__dirname + "/zip_workdir/zipped/"+timestamp+"/func.zip");
  const extDir = path.join(__dirname+"/zip_workdir/extracted/"+timestamp+"/");

  child_process.execSync('unzip '+zipFile+' -d '+extDir);

  logger.log("Zip action succesfully extracted","info");

}

function zipDirLocal(subfolder){

  const zipPath = path.join(__dirname,subfolder);
  child_process.execSync('zip -r '+zipPath+'  *', {
    cwd: zipPath
  });
}

function cleanDirs(subdir){
  const full_path = path.join(__dirname,"")+subdir;
  fs.rm(full_path, { recursive: true }, (err) => {

    if (err) {
        logger.log("Error while deleting directory " + subdir,"error");
        throw err;
    }

    logger.log("Directory "+subdir+", has been deleted!","info");
    return;
    
  });
  
}

module.exports = {extractZipLocal,cleanDirs,zipDirLocal}