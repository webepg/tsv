FROM pull ghcr.io/puppeteer/puppeteer:24.17.0
ENV  PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci
COPY . .
RUN ["node, index.js"]