# Node.js 24 + pnpm
FROM node:24-alpine
WORKDIR /app

# Enable corepack and prepare pnpm (before copying files for layer caching)
RUN corepack enable && corepack prepare pnpm@11.15.1 --activate

# Copy only package files (separate layer for dependency caching)
COPY package*.json pnpm-lock*.yaml ./

# Install dependencies
RUN pnpm install

# Copy application code
COPY . .

EXPOSE 3000
CMD ["pnpm", "start"]