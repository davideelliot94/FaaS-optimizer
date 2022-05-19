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

/*
function extractZipLocal (timestamp) {

  logger.log("Extracting zip action in directory /zipped/"+timestamp,"info");
  const zipFile = path.join(__dirname + "/zip_workdir/zipped/"+timestamp+"/func.zip");
  const extDir = path.join(__dirname+"/zip_workdir/extracted/"+timestamp+"/");

  child_process.execSync('unzip '+zipFile+' -d '+extDir);

  logger.log("Zip action succesfully extracted","info");

}*/

function zipDirLocal(subfolder){

  const zipPath = path.join(__dirname,subfolder);
  child_process.execSync('zip -r '+zipPath+'  *', {
    cwd: zipPath
  });
  /*
  const subFoldArr = subfolder.split("/");
  const timestamp = subFoldArr[subFoldArr.length -1]
  const archive = archiver('zip', { zlib: { level: 9 }});
  const stream = fs.createWriteStream(subfolder+"/"+timestamp+".zip");

  return new Promise((resolve, reject) => {
    archive
      .directory(subfolder, false)
      .on('error', err => reject(err))
      .pipe(stream)
    ;

    stream.on('close', () => resolve());
    archive.finalize();
  });*/
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



/*

var file_system = require('fs');
var archiver = require('archiver');

var output = file_system.createWriteStream('target.zip');
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
archive.directory(source_dir, false);

// append files from a sub-directory and naming it `new-subdir` within the archive
archive.directory('subdir/', 'new-subdir');

archive.finalize();

*/