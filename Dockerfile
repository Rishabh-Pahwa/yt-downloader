FROM node:22-alpine AS builder

WORKDIR /app

# Install deps
COPY package*.json ./
RUN npm ci

# Copy source and build SvelteKit
COPY . .
RUN npm run build

# ── Runtime ──────────────────────────────────────────────────────────────────
FROM node:22-alpine

# Install yt-dlp and ffmpeg
RUN apk add --no-cache python3 ffmpeg curl && \
    curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp

WORKDIR /app

# Copy production deps
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built SvelteKit output and server
COPY --from=builder /app/build ./build
COPY index.js ./

# Temp dir for downloads
RUN mkdir -p /tmp/yt_downloads

ENV NODE_ENV=production
ENV PORT=3000
ENV DOWNLOAD_DIR=/tmp/yt_downloads

EXPOSE 3000

CMD ["node", "index.js"]
