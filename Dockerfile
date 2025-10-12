# Use Node.js 23 (matching your local version)
FROM node:23-slim
 
# Install system dependencies for Puppeteer/Chrome
RUN apt-get update && apt-get install -y \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libxss1 \
    libxtst6 \
    lsb-release \
    wget \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*
 
# Create app directory
WORKDIR /app
 
# Copy package files first (for better Docker layer caching)
COPY package*.json ./
 
# Set environment variables to skip Puppeteer download during npm install
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_SKIP_DOWNLOAD=true
 
# Install Node.js dependencies without Puppeteer downloading Chromium
RUN npm ci --omit=dev && npm cache clean --force
 
# Copy application source code
COPY . .
 
# Set environment variables for runtime
ENV NODE_ENV=production
ENV PORT=8080
 
# Expose port
EXPOSE 8080
 
# Start the application
CMD ["npm", "start"]