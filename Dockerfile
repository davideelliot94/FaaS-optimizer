FROM node:latest

#ENV API_HOST="owdev-nginx.openwhisk.svc.cluster.local"
ENV API_HOST=""
#ENV METRICS_ENDPOINT="owdev-prometheus-server.openwhisk.svc.cluster.local:9090/api/v1/query?"
ENV METRICS_ENDPOINT=""
ENV AMBIENT=""

COPY . /faas-optimizer

WORKDIR /faas-optimizer/src

RUN npm install
RUN apt-get update
RUN apt install zip

EXPOSE 4000

CMD npm start