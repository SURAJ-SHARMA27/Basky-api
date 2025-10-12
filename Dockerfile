FROM ghcr.io/puppeteer/puppeteer:latest
 
WORKDIR /app
COPY package*.json ./
 
# Skip Puppeteer download (we’ll provide system chromium)
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
 
RUN npm ci --omit=dev && npm cache clean --force
 
# Install chromium from Debian repo
USER root
RUN apt-get update && apt-get install -y chromium && rm -rf /var/lib/apt/lists/* \
 && (which chromium || echo "chromium not found") \
 && ln -sf /usr/bin/chromium /usr/bin/google-chrome || true
 
# Provide path for your code (if you add executablePath)
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
 
COPY . .
ENV NODE_ENV=production PORT=8080
EXPOSE 8080
CMD ["npm","start"]