#!/usr/bin/env bash
# exit on errorset -o errexit

npm install
# npm run build # uncomment if required
npx puppeteer browsers install chrome