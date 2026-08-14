FROM nginx:1.27-alpine

# Static site config: serves the SPA and proxies /api to the backend service
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Frontend source (no build step required — plain HTML/CSS/JS ES modules)
COPY src /usr/share/nginx/html

EXPOSE 80
