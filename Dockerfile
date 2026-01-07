FROM node:18-buster

# 1. Install FFmpeg & ALAT BUILD (Penting buat Sharp/Couchbase)
RUN apt-get update && \
    apt-get install -y \
    ffmpeg \
    imagemagick \
    webp \
    build-essential \
    python3 \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev && \
    apt-get upgrade -y && \
    rm -rf /var/lib/apt/lists/*

# 2. Set Folder Kerja
WORKDIR /app

# 3. Copy file konfigurasi dulu (Optimasi Cache)
COPY package.json ./

# 4. Install Library (Dengan flag khusus biar kompatibel)
# --omit=dev: Gak usah install library developer biar hemat
# --ignore-scripts: Kadang script install suka error di cloud, kita skip aja yang gak perlu
RUN npm install --omit=dev

# 5. Copy Sisa File Bot
COPY . .

# 6. Buka Port
EXPOSE 8080

# 7. Jalankan
CMD ["node", "index.js"]
