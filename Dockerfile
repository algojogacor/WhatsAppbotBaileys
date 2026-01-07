# Gunakan Node.js versi FULL (Bukan Slim/Alpine)
# Versi ini sudah punya Python, GCC, Make, dll bawaan. Anti-gagal install library berat.
FROM node:18

# 1. Install FFmpeg (Wajib buat stiker)
RUN apt-get update && \
    apt-get install -y ffmpeg && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# 2. Set Folder Kerja
WORKDIR /app

# 3. Copy Package
COPY package.json ./

# 4. Install Dependencies
# Kita matikan audit biar lebih cepat
RUN npm install --no-audit

# 5. Copy Sisa File
COPY . .

# 6. SETTING PORT (PENTING BUAT KOYEB)
# Koyeb mendeteksi port 8000 secara default
ENV PORT=8000
EXPOSE 8000

# 7. Jalankan
CMD ["node", "index.js"]
