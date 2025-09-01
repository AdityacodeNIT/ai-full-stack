FROM node:20-slim


WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose Vite port (5173)
EXPOSE 3000

# Start Vite dev server on all interfaces
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
