FROM node:latest

ENV API_HOST="owdev-apigateway.openwhisk.svc.cluster.local"
ENV AMBIENT=""

COPY . /src

WORKDIR /src

RUN npm install

EXPOSE 4000

CMD npm start
