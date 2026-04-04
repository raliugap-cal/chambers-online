FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY server.js db-client.js ./
COPY *.html ./
RUN addgroup -g 1001 -S nodejs && adduser -S chambers -u 1001 && chown -R chambers:nodejs /app
USER chambers
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://localhost:${PORT:-3000}/health || exit 1
CMD ["node", "server.js"]
