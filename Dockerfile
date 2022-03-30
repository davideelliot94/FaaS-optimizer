FROM node:latest

#ENV API_HOST="owdev-nginx.openwhisk.svc.cluster.local"
ENV API_HOST=""
ENV AMBIENT=""

COPY . /src

WORKDIR /src

RUN npm install

EXPOSE 4000

CMD npm start