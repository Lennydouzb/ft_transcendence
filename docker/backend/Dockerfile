FROM node:22-alpine
WORKDIR /app
COPY tools/package.json /app
RUN npm install
COPY ../srcs/server /app
CMD ["node","server.js"]
