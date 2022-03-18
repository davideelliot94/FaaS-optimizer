#!/bin/bash
CONTAINER="faas-optimizer"$RANDOM
echo "Running container " $CONTAINER
sudo docker run -d --name $CONTAINER -p 4000:4000 davideelliot/faas-optimizer:0.2
echo "Done!"
