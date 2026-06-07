FROM node:20-slim
RUN apt-get update -y && apt-get install -y openssl tesseract-ocr tesseract-ocr-spa libtesseract-dev
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY prisma ./prisma
RUN npx prisma generate
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]