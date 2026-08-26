FROM node:lts-alpine
ENV NODE_ENV=production
WORKDIR /usr/src/app

# Railway builds from the repository root, so the backend lives in /vtg-backend.
COPY vtg-backend/package.json ./
COPY vtg-backend/package-lock.json* ./
COPY vtg-backend/npm-shrinkwrap.json* ./
RUN npm install --production --silent

COPY vtg-backend/ ./
COPY api/ ./api/

# The Railway service also serves the public VTG frontend from this container.
COPY frontend-v3.html ./frontend-v3.html
COPY logo-override.js ./logo-override.js
COPY map-enhancer.js ./map-enhancer.js
COPY visual-enhancer.js ./visual-enhancer.js
COPY vtg-commerce.js ./vtg-commerce.js
COPY vtg-map-fix.js ./vtg-map-fix.js
COPY vtg-market-news.js ./vtg-market-news.js
COPY vtg-ui-repair.js ./vtg-ui-repair.js
COPY vtg-atlas-ui.js ./vtg-atlas-ui.js
COPY assets/ ./assets/

EXPOSE 3000
RUN chown -R node /usr/src/app
USER node
CMD ["npm start"]
