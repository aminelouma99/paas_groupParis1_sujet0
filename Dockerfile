# Run unit test
FROM node:10 AS test

RUN mkdir -p /src
COPY package.json /src/package.json

WORKDIR /src
RUN npm install

COPY . /src
RUN npm test


# Install production module only
FROM node:10 AS builder

USER node
COPY --chown=node:node --from=test /src /src

WORKDIR /src
RUN rm -rf node_module
RUN rm -rf test

RUN npm install --only=production


# Production container
FROM node:10-alpine AS production

USER node
COPY --chown=node:node --from=builder /src /src

WORKDIR /src
CMD npm start
