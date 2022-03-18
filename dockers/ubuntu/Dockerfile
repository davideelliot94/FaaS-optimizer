FROM ubuntu

RUN apt-get update
RUN apt install -y nodejs
RUN apt install npm -y
RUN npm install -g npm@latest

ENV API_HOST="owdev-apigateway.openwhisk.svc.cluster.local"

COPY . /faasopt

WORKDIR /faasopt

RUN npm install

EXPOSE 4000

CMD npm start >> faasopt.log 2>&1
