const fs = require('fs');
const path = require("path");
var AdmZip = require('adm-zip');
const child_process = require("child_process");


function extractZipLocal (timestamp) {

    logger.log("Extracting zip action in directory /zipped/"+timestamp,"info");
    var file = new AdmZip(path.join(__dirname, '../../src')+"/zipped/"+timestamp+"/func.zip");
    file.extractAllTo(path.join(__dirname, '../../src')+"/extracted/"+timestamp , true);
    logger.log("Zip action succesfully extracted","info");

}

function zipDirLocal(timestamp){

    child_process.execSync('zip -r '+ timestamp+'  *', {
      cwd: path.join(__dirname, '../../')+"binaries/"+timestamp
    });
}

function cleanDirs(subdir){
  fs.rm(path.join(__dirname,"../extracted/"+subdir), { recursive: true }, (err) => {
    if (err) {
        logger.log("Error while deleting directory " + subdir,"error");
        throw err;
    }

    
    fs.rm(path.join(__dirname,"../zipped/"+subdir), { recursive: true }, (err) => {
      if (err) {
          logger.log("Error while deleting directory " + subdir,"error");
          throw err;
      }
  
      logger.log("Directory "+subdir+", has been deleted!","info");
      return;
    });
  });
  
}

module.exports = {extractZipLocal,cleanDirs,zipDirLocal}