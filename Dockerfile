FROM ghcr.io/puppeteer/puppeteer:24.17.0
ENV  PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci && which google-chrome-stable
COPY . .
#CMD ["which", "google-chrome-stable"]
CMD ["node", "index.js"]