FROM ghcr.io/puppeteer/puppeteer:21.3.8

USER root
WORKDIR /app

COPY package*.json ./
RUN chown -R pptruser:pptruser /app

USER pptruser

ENV NODE_ENV=production
ENV PUPPETEER_CACHE_DIR=/home/pptruser/.cache/puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Only install npm packages (Chrome already in base image)
RUN npm ci --omit=dev && \
    npm cache clean --force

COPY --chown=pptruser:pptruser . .

ENV PORT=8080
EXPOSE 8080
CMD ["npm","start"]
