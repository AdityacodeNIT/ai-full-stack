FROM node:20-slim


WORKDIR /app

# Copy package files
COPY ai-ticket-assistant/package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY ai-ticket-assistant/ ./

# Expose Vite port (5173)
EXPOSE 8000

# Start Vite dev server on all interfaces
CMD ["npm", "start"]
