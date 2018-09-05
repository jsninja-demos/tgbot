FROM node:10
WORKDIR /app
COPY package.json ./
COPY package-lock.json ./
COPY . .
RUN npm install
EXPOSE 3000
ENV ninjapatreon_port 3000
CMD ["npm", "start"]