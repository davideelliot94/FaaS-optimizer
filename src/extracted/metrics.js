function getMetrics(){
    /*
    logger.log("/api/v1/action/delete","info");
    try {
        fetch('https://'+conf.API_HOST+'/api/v1/namespaces/_/actions/'+req.body.name,{
        method: 'DELETE',
        headers: {
            'Authorization':'Basic '+ btoa(conf.API_KEY)
        },
        agent: httpsAgent
      })
        .then(response => response.json())
        .then(data => {
            res.json(data);
            logger.log("/api/v1/action/delete " + data,"info")
        }).catch(err =>{
            logger.log("An error occurred while deleting action: "+req.body.name,"WARN")
            res.json("An error occurred while deleting action: "+req.body.name);
        });
    } catch (error) {
        logger.log("An error occurred while deleting action: "+req.body.name,"error")
        res.json(error);
    }*/
    
};

module.exports = {getMetrics}