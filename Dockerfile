# --- Stage 1: Build the React Frontend ---
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# --- Stage 2: Build the Node.js Backend & Final Image ---
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

# Copy backend dependencies and source code
COPY package*.json ./
RUN npm ci --only=production
COPY . .

# Pull compiled frontend assets from Stage 1 into the backend public folder
COPY --from=frontend-builder /app/frontend/dist ./public

EXPOSE 5000
CMD ["node", "server.js"]
