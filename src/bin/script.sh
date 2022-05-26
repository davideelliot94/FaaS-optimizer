#!bin/bash

wget -O ../../cli/main-cli https://raw.githubusercontent.com/davideelliot94/FaaS-Optimizer-CLI/main/fopt -q --show-progress
wget -O ../../cli/setup_cli.sh https://raw.githubusercontent.com/davideelliot94/FaaS-Optimizer-CLI/main/setup_cli.sh -q --show-progress


echo "-------------------------------------------------------------------------------------------  \n\n"
echo ">\tPlease make sure python3 is correctly installed, otherwise cli won't be usable\n\n"
echo ">Follow these step to complete cli installation:"
echo ">\tPlease move the file 'main-cli' in a directory under your path ( eg. /bin , /usr/local/bin )"
echo ">\tand add the following line to your 'bashrc' file ( according to the choosen directory ) \n\n"
echo ">\texport PATH=$PATH:~<choosen dir>\n"
echo "-------------------------------------------------------------------------------------------  \n\n"


npm start
