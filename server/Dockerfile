FROM node:18-alpine

WORKDIR /app/server

# Copy package files
COPY server/package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy all server files
COPY server/ ./

# Expose port
EXPOSE 3000

# Start the app
CMD ["npm", "start"]
