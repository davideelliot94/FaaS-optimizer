FROM node:latest

ENV API_HOST="owdev-apigateway.openwhisk.svc.cluster.local"

COPY . /src

WORKDIR /src

RUN npm install

EXPOSE 4000

CMD npm start > faasopt.log 2>&1
