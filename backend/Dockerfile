FROM node:22-alpine

# OpenSSL is required by Prisma's query engine on Alpine
RUN apk add --no-cache openssl

WORKDIR /app

# Install dependencies first for better layer caching
COPY package.json package-lock.json ./
RUN npm ci

# Copy the application and generate the Prisma client
COPY . .
RUN npx prisma generate

EXPOSE 3000

# Entrypoint applies migrations, seeds demo data, then starts the API
CMD ["sh", "docker-entrypoint.sh"]
