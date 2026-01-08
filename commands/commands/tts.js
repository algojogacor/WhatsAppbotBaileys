const gTTS = require('gtts');
const fs = require('fs');
const path = require('path');

module.exports = async (command, args, msg) => {
    if (command !== 'tts') return;

    const text = args.join(' ');
    if (!text) return msg.reply("❌ Masukkan teksnya bro! Contoh: *!tts halo semuanya*");

    // Tentukan bahasa (default: Indonesia 'id')
    const lang = 'id';
    const tts = new gTTS(text, lang);
    const fileName = `tts_${Date.now()}.mp3`;
    const filePath = path.join(__dirname, `../temp/${fileName}`);

    // Pastikan folder temp ada
    if (!fs.existsSync(path.join(__dirname, '../temp'))) {
        fs.mkdirSync(path.join(__dirname, '../temp'));
    }

    try {
        tts.save(filePath, async (err) => {
            if (err) {
                console.error(err);
                return msg.reply("❌ Gagal mengubah teks ke suara.");
            }

            const media = MessageMedia.fromFilePath(filePath);
            
            // Mengirim sebagai Voice Note (sendAudioAsVoice: true)
            await msg.reply(media, null, { sendAudioAsVoice: true });

            // Hapus file setelah terkirim agar penyimpanan tidak penuh
            setTimeout(() => {
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            }, 5000);
        });
    } catch (e) {
        console.error(e);
        msg.reply("❌ Terjadi kesalahan pada sistem TTS.");
    }
};