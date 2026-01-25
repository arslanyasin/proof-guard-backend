# ========================================
# Proxy Server Backend - Dockerfile
# ========================================
# Optimized for Jenkins CI/CD builds
FROM node:21.4.0-slim

# Create non-root user for security
RUN groupadd --gid 1001 nodejs && \
    useradd --uid 1001 --gid nodejs --shell /bin/bash --create-home nestjs

# Set working directory
WORKDIR /app

# Install dumb-init for proper signal handling and PDF processing dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    dumb-init \
    graphicsmagick \
    ghostscript \
    && rm -rf /var/lib/apt/lists/*

# Create necessary directories including temp directory for PDF processing
RUN mkdir -p /app/logs /app/tmp && \
    chown -R nestjs:nodejs /app && \
    chmod 755 /app/tmp

# Set temp directory environment variable to app-owned directory
ENV TMPDIR=/app/tmp

# Copy built application from Jenkins workspace
# Note: These files are built in Jenkins pipeline stages
COPY --chown=nestjs:nodejs dist/ ./dist/
COPY --chown=nestjs:nodejs node_modules/ ./node_modules/
COPY --chown=nestjs:nodejs package*.json ./

# Copy the generated Prisma client
COPY --chown=nestjs:nodejs generated/ ./generated/

# Copy scripts and configuration files
COPY --chown=nestjs:nodejs nest-cli.json ./

# Switch to non-root user
USER nestjs

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/main"]
