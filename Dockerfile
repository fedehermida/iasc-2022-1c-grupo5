#DEVELOPMENT ENVIRONMENT
FROM node:16-alpine AS development
ARG SERVICE
ENV SERVICE=$SERVICE
WORKDIR /workspace
COPY package*.json /workspace/
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build -- ${SERVICE}

#PRODUCTION ENVIRONMENT
FROM node:16-alpine AS production
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
WORKDIR /workspace
COPY --from=development /workspace .
EXPOSE 3000
CMD ["sh", "-c", "node dist/apps/$SERVICE/main"]