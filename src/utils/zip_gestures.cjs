const fs = require('fs');
const path = require("path");
const child_process = require("child_process")
const logger = require("../log/logger.cjs");
var archiver = require('archiver');
const extract = require('extract-zip')
 
async function extractZipLocal (timestamp) {
  logger.log("Extracting zip action in directory /zipped/"+timestamp,"info");

  try {
    await extract(__dirname + "/zip_workdir/zipped/"+timestamp+"/func.zip", { dir: __dirname+"/zip_workdir/extracted/"+timestamp+"/" })
    //console.log('Extraction complete')
    logger.log("Zip action succesfully extracted","info");
  } catch (err) {
    // handle any errors
  }
}

function zipDirLocal(subfolder){
  const zipPath = path.join(__dirname,subfolder);
  var output = fs.createWriteStream(zipPath+".zip");
  var archive = archiver('zip');

  output.on('close', function () {
      console.log(archive.pointer() + ' total bytes');
      console.log('archiver has been finalized and the output file descriptor has closed.');
  });

  archive.on('error', function(err){
      throw err;
  });

  archive.pipe(output);

  // append files from a sub-directory, putting its contents at the root of archive
  archive.directory(zipPath, false);

  archive.finalize();

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


