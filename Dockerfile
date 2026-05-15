FROM node:18-alpine
WORKDIR /app
COPY . .
EXPOSE 5500
CMD ["node", "server.js"]
