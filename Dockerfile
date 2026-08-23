FROM node:22-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM dependencies AS build
COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src
RUN npm run build

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN apk add --no-cache dumb-init \
    && addgroup -S nodeapp \
    && adduser -S nodeapp -G nodeapp
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev && npm run generate && npm cache clean --force
COPY --from=build /app/dist ./dist
RUN mkdir -p /app/uploads && chown -R nodeapp:nodeapp /app/uploads
USER nodeapp
EXPOSE 5000
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
