FROM node:lts-alpine
ENV NODE_ENV=production
WORKDIR /usr/src/app

# Railway builds this Dockerfile with vtg-backend as the build context.
COPY package.json ./
COPY package-lock.json* ./
COPY npm-shrinkwrap.json* ./
RUN npm install --production --silent

COPY ./ ./

EXPOSE 3000
RUN chown -R node /usr/src/app
USER node
CMD ["npm", "start"]
