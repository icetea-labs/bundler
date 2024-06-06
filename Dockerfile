FROM node:18 AS builder
WORKDIR /app
COPY . .
RUN yarn && yarn preprocess

FROM alpine:latest
RUN apk add --no-cache ca-certificates multirun
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
CMD [ "node", "dist/index.js bundler --unsafe" ]
