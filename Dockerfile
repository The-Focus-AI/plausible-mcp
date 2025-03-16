# Use Node.js 21 (Latest) as base image (includes npm)
FROM node:23-bookworm-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    git \
    ripgrep \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user to run Claude and set up npm permissions
RUN useradd -m claude && \
    chown -R claude:claude /app && \
    mkdir -p /home/claude/.npm-global && \
    chown -R claude:claude /home/claude/.npm-global

# Switch to non-root user
USER claude

# Configure npm to use the new directory
ENV NPM_CONFIG_PREFIX=/home/claude/.npm-global
ENV PATH=/home/claude/.npm-global/bin:$PATH

# Install Claude Code globally for the claude user
RUN npm install -g @anthropic-ai/claude-code

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    NODE_ENV=production

# Set the default command
CMD ["claude"]

# Note: You'll need to set ANTHROPIC_API_KEY as an environment variable when running the container
# Example: docker run -e ANTHROPIC_API_KEY=your_api_key -it claude-container 