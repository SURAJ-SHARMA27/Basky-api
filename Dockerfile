FROM ghcr.io/puppeteer/puppeteer:21.3.8

USER root
WORKDIR /app

COPY package*.json ./

RUN chown -R pptruser:pptruser /app
USER pptruser

# Ensure package.json puppeteer version == 21.3.8
# Remove skip env so required Chrome revision downloads if missing
ENV NODE_ENV=production
ENV PUPPETEER_CACHE_DIR=/home/pptruser/.cache/puppeteer

RUN npm ci --omit=dev && \
    npx puppeteer browsers install chrome && \
    ls -al /home/pptruser/.cache/puppeteer && \
    npm cache clean --force

COPY --chown=pptruser:pptruser . .

ENV PORT=8080
EXPOSE 8080
CMD ["npm","start"]
