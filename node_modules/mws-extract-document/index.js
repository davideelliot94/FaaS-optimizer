const fs = require('fs');
const decompress = require('decompress');
const decompressUnzip = require('decompress-unzip');

const decodeBase64ToBinary = (base64String) => {
    input   = new Buffer.from(base64String, 'base64');
    decode  = input.toString('binary'); // decode to binary
    return decode;
};

const extractZip = (base64String, dist) => new Promise((resolve, reject) => {
    let binaryString = decodeBase64ToBinary(base64String);
    fs.writeFile(dist, binaryString, {encoding: 'binary'}, err => {
        if (err) reject(err)
        else resolve('file saved!');
    });
});

module.exports = extractZip;
