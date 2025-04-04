FROM node:20
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy contract artifacts and source code
COPY artifacts/ ./artifacts/
COPY contracts/ ./contracts/
COPY scripts/ ./scripts/

# Run the bot
CMD ["node", "scripts/monitor.js"]