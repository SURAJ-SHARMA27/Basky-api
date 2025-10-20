## Pin the puppeteer base image to the same major/minor version as the npm dependency
## Using :latest caused a mismatch between installed Chromium and the revision expected by puppeteer 21.3.8
FROM ghcr.io/puppeteer/puppeteer:21.3.8
 
# Become root to create workspace with correct ownership
USER root
WORKDIR /app
 
# Copy manifests first
COPY package*.json ./
 
# Give ownership to default non-root user (pptruser defined in base image)
RUN chown -R pptruser:pptruser /app
 
# Switch to non-root user for deterministic, safer installs
USER pptruser
 
# Prevent extra browser downloads (image already includes matching Chromium)
ENV PUPPETEER_SKIP_DOWNLOAD=true \
	PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
 
# Install production deps
RUN npm ci --omit=dev && npm cache clean --force
 
# Copy rest of source (still as pptruser)
COPY --chown=pptruser:pptruser . .
 
ENV NODE_ENV=production
ENV PORT=8080
# If you explicitly want to force executable path, uncomment below (common chromium paths shown)
# ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
 
EXPOSE 8080
CMD ["npm","start"]
