FROM node:lts-alpine
ENV NODE_ENV=production
WORKDIR /usr/src/app

# Railway builds from the repository root, so the backend lives in /vtg-backend.
COPY vtg-backend/package.json ./
COPY vtg-backend/package-lock.json* ./
COPY vtg-backend/npm-shrinkwrap.json* ./
RUN npm install --production --silent

COPY vtg-backend/ ./

EXPOSE 3000
RUN chown -R node /usr/src/app
USER node
CMD ["npm", "start"]
