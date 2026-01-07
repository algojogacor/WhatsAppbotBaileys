# Gunakan Node.js Versi Lengkap (Bukan Slim)
# Ini sudah ada Python & Build Tools bawaan, jadi anti-gagal.
FROM node:18

# 1. Install FFmpeg saja (Sisanya sudah ada)
RUN apt-get update && \
    apt-get install -y ffmpeg && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# 2. Set Folder Kerja
WORKDIR /app

# 3. Copy Package
COPY package.json ./

# 4. Install Dependencies
# Kita biarkan npm yang mengatur build-nya otomatis
RUN npm install

# 5. Copy Sisa File
COPY . .

# 6. Buka Port
EXPOSE 8080

# 7. Jalankan
CMD ["node", "index.js"]
