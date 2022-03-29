var detectLang = require('lang-detector');


//npm install lang-detector --save
function detectLang(snippet){
    const lang =  detectLang(snippet);
    if(lang == 'JavaScript') lang = 'nodejs';
    return lang;
}


function detectLangSimple(snippet){
    if(snippet.includes("function ")){
        return "nodejs";
    }
    if(snippet.includes("def ")){
        return "python";
    }
}

module.exports = {detectLang};