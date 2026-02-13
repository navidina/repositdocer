# Use Node.js LTS
FROM node:18-alpine

# Create app directory
WORKDIR /app

# Install app dependencies
COPY package*.json ./
RUN npm ci --only=production
# Also install dev dependencies for build if needed, but 'npm ci' installs based on package-lock.
# Actually 'npm ci' installs everything unless --only=production is passed.
# Since we need to build TS, we need devDependencies.
RUN npm install

# Bundle app source
COPY . .

# Build TypeScript code
RUN npm run build

# Expose port
EXPOSE 3000

# Start command
CMD ["npm", "start"]
