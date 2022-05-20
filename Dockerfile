FROM node:latest

ENV API_HOST=""
ENV METRICS_ENDPOINT=""
ENV AMBIENT=""

COPY . /faas-optimizer

WORKDIR /faas-optimizer/src

VOLUME  "/cli" 

RUN npm install --production
RUN apt-get update
RUN apt install zip

EXPOSE 4000

CMD sh script.sh