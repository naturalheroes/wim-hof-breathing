FROM node:18-alpine

# Create app directory
WORKDIR /app

# Install a simple HTTP server
RUN npm install -g serve

# Copy all files
COPY . .

# Expose port 3000
EXPOSE 3000

# Start the server
CMD ["serve", "-s", ".", "-p", "3000"] 