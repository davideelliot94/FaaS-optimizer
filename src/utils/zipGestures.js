const fs = require('fs');
const path = require("path");

function extractZipLocal (timestamp) {

    var AdmZip = require('adm-zip');
    logger.log("Extracting zip action in directory /zipped/"+timestamp,"info");
    var file = new AdmZip(path.join(__dirname, '../../src')+"/zipped/"+timestamp+"/func.zip");
    file.extractAllTo(path.join(__dirname, '../../src')+"/extracted/"+timestamp , true);
    logger.log("Zip action succesfully extracted","info");

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

/*
function walk(dir, done) {
  console.log("-----------------------");
  console.log("WALK");
  console.log("-----------------------\n\n");
  var results = [];
  fs.readdir(dir, function(err, list) {
    console.log("READDIR");
    if (err) {
      console.log("ERROR");
      return done(err);
    }
    var i = 0;
    (function next() {
      var file = list[i++];
      console.log("READDIR");
      if (!file) {
        console.log("NOT A FILE");
        return done(null, results);
      }
      file = path.resolve(dir, file);
      fs.stat(file, function(err, stat) {
        if (stat && stat.isDirectory()) {
          walk(file, function(err, res) {
            results = results.concat(res);
            next();
          });
        } else {
          results.push(file);
          next();
        }
      });
    })();
  });
};*/



module.exports = {extractZipLocal,cleanDirs}