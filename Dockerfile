FROM nginx:alpine

# Copy all files to the nginx html directory
COPY . /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Default command to start nginx in the foreground
CMD ["nginx", "-g", "daemon off;"] 