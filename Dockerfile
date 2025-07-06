# Use a Node.js base image
FROM node:20-slim

# Install build dependencies for native modules like better-sqlite3
RUN apt-get update && apt-get install -y python3 g++ make

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install --build-from-source better-sqlite3 && npm ci

# Copy the rest of the application code
COPY . .

# Build the frontend
RUN npm run build

# Build the backend
RUN npm run build:backend

# Expose the port your Express server listens on
EXPOSE 3001

# Start the Express server
CMD ["npm", "start"]
