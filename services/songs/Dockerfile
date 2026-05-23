FROM node:20-slim

# Prisma necesita OpenSSL
RUN apt-get update -y && apt-get install -y openssl

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY service-account.json ./

COPY . .

# Solo auth necesita esto; en los demás no hace nada
RUN npx prisma generate 2>/dev/null || true

EXPOSE 3000

CMD ["npm", "run", "dev"]