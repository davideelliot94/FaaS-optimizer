#!/bin/bash

sudo docker ps --filter name=faas-optimizer* -aq | xargs sudo docker stop

