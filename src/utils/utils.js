function getBodyFields(body){
    return Object.keys(body);
}

function mergeFuncs(funcs,seqName){

    logger.log("Mergning actions","info");
    var param = funcs[0].param;
    var wrappedFunc = "function main("+param+") {";
    funcs.forEach(f => {
        wrappedFunc = wrappedFunc.concat(f.code);
    });

    funcs.forEach((f,i) => {
        if(i == funcs.length -1){
            wrappedFunc = wrappedFunc.concat("return ").concat(f.invocation).concat(param+");");
        }
        else{
            wrappedFunc = wrappedFunc.concat("var "+f.name+"Res = ").concat(f.invocation).concat(param+");");
            param = f.name+"Res";
        }
        
    });
    wrappedFunc = wrappedFunc.concat("}");

    return wrappedFunc;
}

module.exports = { getBodyFields,mergeFuncs};