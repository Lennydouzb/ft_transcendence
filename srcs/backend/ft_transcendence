FROM node:22-alpine
WORKDIR /app
COPY docker/backend/tools/package.json /app
RUN apk add --no-cache python3 make g++
RUN npm install
COPY /srcs/backend /app
CMD ["npm","server.js"]
