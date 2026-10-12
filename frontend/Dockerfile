# Frontend image: build the React app, then serve the files with nginx.
# nginx also forwards /api, /media, /admin and /static to the backend, so the site has one address.

# 1) build
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# the browser calls /api on its own site; nginx passes it on
ARG VITE_API_BASE=/api
ENV VITE_API_BASE=$VITE_API_BASE
RUN npm run build

# 2) serve
FROM nginx:1.27-alpine
# nginx fills ${BACKEND_URL} into this template when the container starts
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
ENV BACKEND_URL=http://backend:8000
EXPOSE 80
