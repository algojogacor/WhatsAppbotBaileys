# Ganti ke Bullseye (Lebih stabil buat Sharp/Couchbase)
FROM node:18-bullseye-slim

# 1. Install Library Penting (FFmpeg, Python, Build Tools)
# Kita gabung jadi satu baris biar hemat layer
RUN apt-get update && \
    apt-get install -y \
    ffmpeg \
    imagemagick \
    webp \
    python3 \
    make \
    g++ \
    build-essential \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# 2. Set Folder
WORKDIR /app

# 3. Copy Package dulu
COPY package.json ./

# 4. Install Dependencies
# Kita paksa build dari source jika perlu, dan tampilkan log jika error
RUN npm install --build-from-source=couchbase

# 5. Copy file sisanya
COPY . .

# 6. Buka Port
EXPOSE 8080

# 7. Jalankan
CMD ["node", "index.js"]
