ARG NODE_VERSION=14.15.0

FROM node:${NODE_VERSION}

WORKDIR /app
COPY package.json .
COPY package-lock.json .
RUN npm install --only=dev

COPY broadcasting-service /app/broadcasting-service
COPY definitions /app/definitions
COPY dist /app/dist
COPY dist-src /app/dist-src
COPY docs /app/docs
COPY frontend /app/frontend
COPY sampledata /app/sampledata
COPY scripts /app/scripts
COPY test /app/test

RUN mkdir /app/tmp

# will be overwritten by makefile
CMD ["sleep", "infinity"]
