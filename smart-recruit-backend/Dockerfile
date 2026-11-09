FROM node:22-alpine AS base
WORKDIR /app

FROM base AS development
RUN chown node:node /app
COPY --chown=node:node package*.json ./
USER node
RUN npm ci
COPY --chown=node:node . .
RUN mkdir -p /app/uploads
EXPOSE 5000
CMD ["npm", "run", "start:dev"]

FROM base AS build
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM base AS production-dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM node:22-alpine AS production
ENV NODE_ENV=production \
    PORT=5000
WORKDIR /app
COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package*.json ./
RUN mkdir -p /app/uploads && chown node:node /app/uploads
USER node
EXPOSE 5000
CMD ["node", "dist/main"]
