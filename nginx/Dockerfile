###############################################################################
# Atlas One — Nginx Reverse Proxy
###############################################################################

FROM nginx:1.27-alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Remove default config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Create directories for Let's Encrypt
RUN mkdir -p /var/www/certbot

# Verify nginx config on build
RUN nginx -t

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
