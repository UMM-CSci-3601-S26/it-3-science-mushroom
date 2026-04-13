# Build the client files in a build stage
FROM node:25-alpine as ngbuild

WORKDIR /client

# Install npm dependencies
COPY package*.json /client/
RUN CYPRESS_INSTALL_BINARY=0 npm ci

# Build the Angular project
COPY . /client
RUN npm run docker-build


# Build the production web server and client container
# Caddy is a web server with automatic HTTPS
FROM caddy:2
# Copy the client files from the build stage
COPY --from=ngbuild /client/dist/client /srv
# Copy the Caddyfile (configuration for Caddy)
COPY ./Caddyfile /etc/caddy/Caddyfile
# Set default Caddy host
ENV CADDY_HOST localhost
