# ==========================================
# Stage 1: Build the React frontend
# ==========================================
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy dependency files and install
COPY frontend-new/package*.json ./
RUN npm install

# Copy source and build
COPY frontend-new/ ./
ENV VITE_API_BASE_URL=/api
RUN npm run build

# ==========================================
# Stage 2: Node.js backend
# ==========================================
FROM node:20-alpine

WORKDIR /app

# Copy backend dependencies and install
COPY backend/package*.json ./
RUN npm install

# Copy backend source code
COPY backend/ ./

# Copy built frontend from stage 1 into public directory
COPY --from=frontend-builder /app/frontend/dist ./public

# Create uploads directory for local file storage fallback
RUN mkdir -p uploads

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "server.js"]
