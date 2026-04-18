FROM node:20-slim

# Instalamos OpenSSL, necesario para Prisma en imágenes slim
RUN apt-get update -y && apt-get install -y openssl

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Generamos el cliente de Prisma durante la construcción de la imagen
RUN npx prisma generate

EXPOSE 8080

CMD ["npm", "run", "dev"]