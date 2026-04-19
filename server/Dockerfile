FROM node:18-alpine

WORKDIR /app

# Copy server package.json first (better caching)
COPY server/package*.json ./server/

# Install dependencies
RUN cd server && npm ci --omit=dev || cd server && npm install --omit=dev

# Copy the rest of the server code
COPY server/ ./server/

# Set working directory to server
WORKDIR /app/server

# Expose the port your app uses (change if needed)
EXPOSE 3000

# Start the app
CMD ["npm", "start"]
