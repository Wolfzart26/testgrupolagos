FROM node:20-alpine
WORKDIR /app

# Instalamos deps (incluye dev para nodemon)
COPY package.json package-lock.json* ./
RUN npm install

# Copiamos el código (será sobreescrito por el volumen de /src en runtime)
COPY src ./src

EXPOSE 3000
CMD ["npm", "run", "dev"]
