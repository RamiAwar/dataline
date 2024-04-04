# as production
FROM node:21-alpine

WORKDIR /app

COPY package.json .

RUN npm install

COPY . .

ENV NODE_ENV=local

EXPOSE 5173

CMD [ "npm", "run", "dev" ]
