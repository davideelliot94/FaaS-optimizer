FROM node:latest

COPY . /src

WORKDIR /src

RUN npm install

EXPOSE 4000

CMD npm start > faasopt.log 2>&1
