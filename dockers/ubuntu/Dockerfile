FROM ubuntu

RUN apt-get update
#RUN apt install -y nodejs:latest
RUN apt install npm -y
RUN npm cache clean -f
RUN npm install -g n
RUN n stable
RUN npm install -g npm@latest

ENV API_HOST=""
ENV METRICS_ENDPOINT=""
ENV AMBIENT=""

COPY . /faasopt

WORKDIR /faasopt

RUN npm install

EXPOSE 4000

CMD npm start >> faasopt.log 2>&1
