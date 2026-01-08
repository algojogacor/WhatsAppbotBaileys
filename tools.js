const axios = require('axios');
const https = require('https');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { saveDB, addQuestProgress } = require('../helpers/database');
const fs = require('fs-extra');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');

// ❌ BAGIAN INI KITA HAPUS (Karena Linux tidak pakai .exe)
// const ffmpegPath = path.join(__dirname, '../ffmpeg.exe');
// ffmpeg.setFfmpegPath(ffmpegPath);

const agent = new https.Agent({ rejectUnauthorized: false });

module.exports = async (command, args, msg, user, db, chat) => {

    // --- FITUR 2: STICKER (FIXED FORMAT) ---
    if (command === "s" || command === "sticker") {
        try {
            const isQuotedImage = msg.message.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;
            const isImage = msg.message.imageMessage;
            const isVideo = msg.message.videoMessage || msg.message.extendedTextMessage?.contextInfo?.quotedMessage?.videoMessage;

            if (isImage || isQuotedImage || isVideo) {
                // 1. Download Media
                let buffer;
                let isVid = false;
                
                if (isQuotedImage || (isVideo && msg.message.extendedTextMessage?.contextInfo?.quotedMessage)) {
                     buffer = await downloadMediaMessage(
                        {
                            key: msg.message.extendedTextMessage.contextInfo.stanzaId,
                            message: msg.message.extendedTextMessage.contextInfo.quotedMessage
                        },
                        'buffer', {}, { logger: console }
                    );
                    if (isVideo) isVid = true;
                } else {
                    buffer = await downloadMediaMessage(msg, 'buffer', {}, { logger: console });
                    if (isVideo) isVid = true;
                }

                // 2. Simpan File Sementara
                const time = Date.now();
                const ext = isVid ? 'mp4' : 'jpg'; 
                const tempInput = path.join(__dirname, `../temp/input_${time}.${ext}`);
                const tempOutput = path.join(__dirname, `../temp/output_${time}.webp`);

                await fs.ensureDir(path.join(__dirname, '../temp'));
                await fs.writeFile(tempInput, buffer);

                // 3. Konversi pakai FFmpeg
                msg.reply("⏳ Membuat stiker...");
                
                await new Promise((resolve, reject) => {
                    const command = ffmpeg(tempInput)
                        .on('error', (err) => {
                            console.error('FFmpeg Error:', err);
                            reject(err);
                        })
                        .on('end', () => resolve());

                    if (isVid) {
                        command.inputFormat('mp4');
                        command.duration(5); 
                    } 

                    command.addOutputOptions([
                        `-vcodec`, `libwebp`,
                        `-vf`, `scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15, pad=320:320:-1:-1:color=white@0.0, split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse`
                    ])
                    .toFormat('webp')
                    .save(tempOutput);
                });

                // 4. Kirim Stiker
                const stickerBuffer = await fs.readFile(tempOutput);
                await chat.sendMessage({ sticker: stickerBuffer });

                // Bersihkan
                fs.unlinkSync(tempInput);
                fs.unlinkSync(tempOutput);

                // Update Quest
                const qNotif = addQuestProgress(user, "sticker");
                if (qNotif) msg.reply(qNotif);
                saveDB(db);

            } else {
                msg.reply("📸 Balas foto/video atau kirim foto dengan caption *!s*");
            }

        } catch (err) {
            console.error("Sticker Error:", err);
            msg.reply("❌ Gagal. Pastikan file tidak rusak.");
        }
    }

    // --- FITUR 3: TOIMG (Ubah Stiker jadi Gambar) ---
    if (command === "toimg") {
        try {
            const isQuotedSticker = msg.message.extendedTextMessage?.contextInfo?.quotedMessage?.stickerMessage;
            
            if (isQuotedSticker) {
                msg.reply("⏳ Mengubah stiker ke gambar...");

                // 1. Download Stiker (WebP)
                const buffer = await downloadMediaMessage(
                    {
                        key: msg.message.extendedTextMessage.contextInfo.stanzaId,
                        message: msg.message.extendedTextMessage.contextInfo.quotedMessage
                    },
                    'buffer', {}, { logger: console }
                );

                // 2. Simpan File Sementara
                const time = Date.now();
                const tempInput = path.join(__dirname, `../temp/sticker_${time}.webp`);
                const tempOutput = path.join(__dirname, `../temp/image_${time}.png`);

                await fs.ensureDir(path.join(__dirname, '../temp'));
                await fs.writeFile(tempInput, buffer);

                // 3. Konversi WebP -> PNG pakai FFmpeg
                await new Promise((resolve, reject) => {
                    ffmpeg(tempInput)
                        .on('error', (err) => {
                            console.error('ToImg Error:', err);
                            reject(err);
                        })
                        .on('end', () => resolve())
                        .outputOptions([
                            '-vframes 1', // Ambil 1 frame saja (kalau stiker gerak)
                            '-vcodec png' // Ubah ke format PNG
                        ])
                        .save(tempOutput);
                });

                // 4. Kirim Gambar
                const imgBuffer = await fs.readFile(tempOutput);
                await chat.sendMessage({ image: imgBuffer, caption: "🖼️ Ini gambarnya!" });

                // Bersihkan
                fs.unlinkSync(tempInput);
                fs.unlinkSync(tempOutput);
                
            } else {
                msg.reply("⚠️ Balas stiker dengan perintah *!toimg*");
            }
        } catch (err) {
            console.error("ToImg Error:", err);
            msg.reply("❌ Gagal. Stiker tidak bisa dikonversi.");
        }
    }

    // FITUR 4: YTMP3
    if (command === "ytmp3") {
        const url = args[0];
        if (!url) return msg.reply("❌ Masukkan URL YouTube!");
        msg.reply("⏳ Sedang memproses audio...");

        try {
            const response = await axios.post("https://co.wuk.sh/api/json", {
                url: url, aFormat: "mp3", isAudioOnly: true
            }, { 
                headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
                httpsAgent: agent 
            });

            if (response.data && response.data.url) {
                await chat.sendMessage({ 
                    audio: { url: response.data.url }, 
                    mimetype: 'audio/mp4',
                    fileName: 'lagu.mp3'
                });
                msg.reply("✅ *Download Berhasil!*");
            } else {
                msg.reply("❌ Gagal mendapatkan link.");
            }
        } catch (err) {
            console.error("YT API Error:", err.message);
            msg.reply("❌ Gagal. Pastikan link valid.");
        }
    }
};