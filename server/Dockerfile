# Build the server files in a build stage
FROM eclipse-temurin:25 AS build
# Copy the project into /tmp/server
COPY . /tmp/server
WORKDIR /tmp/server
# Build the server with Gradle
RUN ./gradlew assemble --no-daemon

# Build the production server container
FROM eclipse-temurin:25
EXPOSE 4567
# Copy the distribution tar that was built in the build stage
COPY --from=build /tmp/server/build/distributions/server.tar /app/
WORKDIR /app
# Untar the server files
RUN tar -xvf server.tar

## Add the wait script to the image
ADD https://github.com/ufoscout/docker-compose-wait/releases/download/2.7.3/wait /wait
RUN chmod +x /wait

# Run the server when the container is started
CMD /wait && server/bin/server
