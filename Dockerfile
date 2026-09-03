# Node.js 24 + pnpm (build only)
FROM node:24-slim
WORKDIR /app

# Install build tools for native modules (better-sqlite3) + ca-certificates for HTTPS
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Install pnpm for build phase only
RUN npm install -g pnpm@11.15.1

# Copy only package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies (build-time only)
RUN pnpm install --frozen-lockfile --ignore-scripts && pnpm rebuild && \
    rm -rf /root/.npm /root/.pnpm-store

# Copy application code
COPY . .

EXPOSE 3000
CMD ["node", "--watch", "server.js"]
