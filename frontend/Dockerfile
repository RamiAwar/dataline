# as production
FROM node:21-alpine
RUN apk --update --no-cache add \
    libc6-compat \
    automake \
    libtool \
    autoconf \
    build-base \
    zlib \
    zlib-dev

WORKDIR /app

COPY package.json .

RUN npm install

COPY . .

ENV NODE_ENV=local

EXPOSE 5173

CMD [ "npm", "run", "dev" ]
