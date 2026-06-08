FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build:ssr

FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/dist/erp-frontend/server ./server
COPY --from=build /app/dist/erp-frontend/browser ./browser
EXPOSE 4000
CMD ["node", "server/server.mjs"]
