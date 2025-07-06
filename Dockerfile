# Use a Node.js base image
FROM node:20-alpine

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci

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
