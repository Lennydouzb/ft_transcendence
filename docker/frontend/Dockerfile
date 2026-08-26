FROM node:22-alpine
WORKDIR /app

COPY srcs/frontend/package*.json ./
RUN npm install
COPY srcs/frontend ./
RUN npm run build
CMD ["npm", "run", "start"]
