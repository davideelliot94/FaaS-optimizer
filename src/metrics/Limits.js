class Limits {

    constructor(
                concurrency,
                logs,
                memory,
                timeout
                ) {
        
        this.concurrency = concurrency
        this.logs = logs
        this.memory = memory
        this.timeout = timeout
      
    }

    get concurrency(){
        return this.concurrency
    }

    get logs(){
        return this.logs
    }

    get memory(){
        return this.memory
    }

    get timeout(){
        return this.timeout
    }

  }

export {Limits}