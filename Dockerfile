FROM node:18-alpine AS deps
WORKDIR /usr/src/app

# Install dependencies (including dev for build)
COPY package.json package-lock.json* ./
RUN npm ci || npm install

FROM node:18-alpine AS builder
WORKDIR /usr/src/app
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY . .

# Build TypeScript
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /usr/src/app
ENV NODE_ENV=production

# Copy build output and production deps
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/package.json ./package.json
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/config ./config
COPY --from=builder /usr/src/app/data ./data
# Ensure SQL migration files are available inside the final image
# TypeScript doesn't copy .sql files into dist by default, so copy them explicitly
COPY --from=builder /usr/src/app/src/database/migrations ./dist/database/migrations

EXPOSE 3000

CMD ["node", "dist/server.js"]
