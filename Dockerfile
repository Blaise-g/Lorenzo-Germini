# Use the official lightweight Node.js 22 image.
FROM node:22-slim

# Install bun
RUN npm install -g bun

# Create and change to the app directory.
WORKDIR /usr/src/app

# Copy dependency manifests.
COPY package.json bun.lock ./

# Install dependencies.
RUN bun install --frozen-lockfile

# Copy local code to the container image.
COPY . .

# Build the app.
RUN bun run build

# Run the web service on container startup.
CMD ["bun", "run", "start"]
