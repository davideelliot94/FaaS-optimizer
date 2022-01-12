# mws-extract-document
[Work around](https://docs.developer.amazonservices.com/en_US/fba_inbound/FBAInbound_ExtractingPdfDocumentData.html) to extract Zip/PDF Document from MWS Base64-encoded string mws api response.

## MWS End-Points
 - GetPackageLabels
 - GetUniquePackageLabels
 - GetPalletLabels
 - GetBillOfLading

## Install
```
$ npm install mws-extract-document --save
```

## Basic Usage

```js
const mwsExtract = require('mws-extract-document');

const dist = './folder/to/document.zip';
const base64String = ''; //located at PdfDocument data response from MWS api.

// PROMISE
mwsExtract(base64String, dist)
          .then((msg)=>{
            // file saved. do something here...
            console.log(msg);
          })
          .catch(err)=>{
            console.log(err);
          });
```

## License
MIT © [Jorge Rosal](https://github.com/yortrosal)
