class Action {

    constructor(name,
                code,
                invocation,
                params,
                binary,
                dependencies,
                kind,
                asynch,
                limits,
                metrics
                ) {
        this.name = name
        this.code = code
        this.invocation = invocation;
        this.params = params
        this.binary = binary
        this.dependencies = dependencies;
        this.kind = kind
        this.asynch = asynch
        this.limits = limits
        this.metrics = metrics;
        this.to_merge = false;
      
    }


    /**
     * GETTERS
     */
    
     get name() {
        return this.name
    }
    

    get code() {
        return this.code
    }

    get invocation() {
        return this.invocation
    }

    get params() {
        return this.params
    }

    get binary() {
        return this.binary
    }

    get dependencies() {
        return this.dependencies
    }

    get kind() {
        return this.kind
    }

    get asynch() {
        return this.asynch
    }

    get limits() {
        return this.limits
    }

    get metrics() {
        return this.metrics
    }

    get to_merge(){
        return this.to_merge
    }

    setToMerge(to_merge){
        this.to_merge = to_merge
    }

    setAsync(isAsynch) {
        this.asynch = isAsynch;
    }   

    // Method
    setMetrics(metric) {

        this.metric = metric;

        //bla bla bla
    }

  }

  export { Action }