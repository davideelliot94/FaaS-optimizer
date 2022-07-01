FROM node:latest

ENV API_HOST=""
ENV METRICS_ENDPOINT=""
ENV ENVIRONMENT=""

COPY . /faas-optimizer

WORKDIR /faas-optimizer/src

VOLUME  "/faas-optimizer/cli" 

RUN npm install --production

EXPOSE 4000

CMD sh bin/script.sh