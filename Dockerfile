FROM node:20-alpine
WORKDIR /app

# Install dependencies — npm install works without package-lock.json
COPY package.json ./
RUN npm install --only=production

# Copy app files
COPY server.js db-client.js ./
COPY *.html ./

# Non-root user
RUN addgroup -g 1001 -S nodejs \
 && adduser  -S chambers -u 1001 \
 && chown -R chambers:nodejs /app

USER chambers
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s \
  CMD wget -qO- http://localhost:${PORT:-3000}/health || exit 1

CMD ["node", "server.js"]
