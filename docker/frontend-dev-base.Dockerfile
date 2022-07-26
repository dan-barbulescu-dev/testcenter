FROM node:16.13.1-buster-slim

RUN apt update && apt install -y chromium python3 make g++ git rsync \
     libgtk2.0-0 libgtk-3-0 libgbm-dev libnotify-dev libgconf-2-4 libnss3 libxss1 libasound2 libxtst6 xauth xvfb