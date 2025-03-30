FROM nginx:alpine

# Copy all files to the nginx html directory
COPY . /usr/share/nginx/html

# Create custom nginx config to listen on port 3000
RUN echo 'server {\n\
    listen 3000;\n\
    server_name localhost;\n\
    location / {\n\
        root /usr/share/nginx/html;\n\
        index index.html;\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
}' > /etc/nginx/conf.d/default.conf

# Expose port 3000
EXPOSE 3000

# Default command to start nginx in the foreground
CMD ["nginx", "-g", "daemon off;"] 