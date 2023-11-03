# Adjust NODE_VERSION as desired
ARG NODE_VERSION=18.4.0
FROM node:${NODE_VERSION}-slim as base

# Set production environment
ENV NODE_ENV="production"

# Throw-away build stage to reduce size of final image
FROM base as build

# Install packages needed to build node modules
RUN apt-get update -qq && \
    apt-get install -y build-essential pkg-config python-is-python3


# Set the working directory
WORKDIR /usr/src/app

# Install Chromium
ENV CHROME_BIN="/usr/bin/chromium" \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD="true" \
    NODE_ENV="production"
RUN apt-get update -qq \
    && apt-get install -y build-essential udev fonts-freefont-ttf \
    chromium git gconf-service libgbm-dev libasound2 libatk1.0-0 libc6 libcairo2 \
    libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 \
    libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 \
    libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 \
    libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation libappindicator1 \
    libnss3 lsb-release xdg-utils wget \
    && rm -rf /var/lib/apt/lists/*

# install yarn globally 
RUN npm install -g yarn

# Copy package.json and package-lock.json to the working directory
COPY package.json ./
COPY yarn.lock ./

# Install the dependencies
# RUN npm ci --only=production --ignore-scripts

# Install the dependencies with yarn
RUN yarn install --production --ignore-scripts

# Copy the rest of the source code to the working directory
COPY . .

# Expose the port the API will run on
EXPOSE 3000

# Start the API
CMD ["npm", "start"]
