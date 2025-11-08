FROM node:18-alpine
WORKDIR /app
# build deps for sqlite native modules
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm install --no-audit --no-fund
COPY . .
EXPOSE 10000
CMD ["npm", "start"]
