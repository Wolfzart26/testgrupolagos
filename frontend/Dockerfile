FROM node:20-alpine
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
# Usa Vite en modo dev (HMR), servimos fuera con 0.0.0.0
EXPOSE 5173
CMD ["npm", "run", "dev"]
