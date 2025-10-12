FROM ghcr.io/puppeteer/puppeteer:latest
 
# Become root to create workspace with correct ownership
USER root
WORKDIR /app
 
# Copy manifests first
COPY package*.json ./
 
# Give ownership to default non-root user (pptruser defined in base image)
RUN chown -R pptruser:pptruser /app
 
# Switch to non-root user for deterministic, safer installs
USER pptruser
 
# Prevent extra browser downloads (image already includes Chrome)
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
 
# Install production deps
RUN npm ci --omit=dev && npm cache clean --force
 
# Copy rest of source (still as pptruser)
COPY --chown=pptruser:pptruser . .
 
ENV NODE_ENV=production
ENV PORT=8080
# (Optional) set executable path only if your code relies on it; otherwise Puppeteer auto-detects
# ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
 
EXPOSE 8080
CMD ["npm","start"]