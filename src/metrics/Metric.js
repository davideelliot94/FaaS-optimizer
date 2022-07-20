class Metric {
    constructor(
              duration,
              waitTime,
              initTime,
              activations,
              coldStarts
              ) {
       this.duration = duration;
       this.waitTime = waitTime;
       this.initTime = initTime;
       this.activations = activations;
       this.coldStarts = coldStarts;
       this.coldStartsRate = this.coldStarts / this.activations
    }

    get duration(){
      return this.duration;
    }

    get waitTime(){
      return this.waitTime;
    }

    get initTime(){
      return this.initTime;
    }

    get activations(){
      return this.activations;
    }

    get coldStarts(){
      return this.coldStarts;
    }

    get coldStartsRate(){
      return this.coldStartsRate
    }


}

export  {Metric}