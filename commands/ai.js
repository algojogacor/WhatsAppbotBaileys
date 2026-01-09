const OpenAI = require('openai');
const axios = require('axios'); // Fotir Share Chat
require('dotenv').config();

const client = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY,
    defaultHeaders: {
        "HTTP-Referer": "https://wa-bot.com",
        "X-Title": "Arya Bot Multi-Model",
    }
});

module.exports = async (command, args, msg, user, db) => {
    // DAFTAR COMMAND
    const validCommands = ['ask', 'ai', 'tanya', 'ai0', 'ai1', 'ai2', 'ai3', 'sharechat', 'history'];

    if (validCommands.includes(command)) {

        // FITUR 1: SHARE CHAT (LINK WEB) 
        if (command === 'sharechat' || command === 'history') {
            if (!user.aiFullHistory || user.aiFullHistory.length === 0) {
                return msg.reply("❌ *Belum ada riwayat chat!* Ngobrol dulu dong sama Algojo.");
            }

            await msg.reply("⏳ *Sedang menyusun riwayat chat & membuat link...*");
            
            // Susun Chat Jadi Teks Rapi
            let historyText = `=== RIWAYAT CHAT: ${user.name || msg.pushName} ===\n`;
            historyText += `Total Pesan: ${user.aiFullHistory.length}\n`;
            historyText += `Dibuat pada: ${new Date().toLocaleString("id-ID")}\n`;
            historyText += `==========================================\n\n`;

            user.aiFullHistory.forEach((chat) => {
                const sender = chat.role === 'user' ? '👤 ARYA' : '🤖 ALGOJO';
                const time = chat.date || '-';
                const model = chat.model ? `[${chat.model}]` : '';
                
                historyText += `${sender} (${time}) ${model}\n`;
                historyText += `${chat.content}\n`;
                historyText += `------------------------------------------\n`;
            });

            // Upload ke Paste.rs
            try {
                const response = await axios.post('https://paste.rs', historyText, {
                    headers: { 'Content-Type': 'text/plain' }
                });
                return msg.reply(`✅ *Sukses! Ini link riwayat chat kamu:*\n\n🔗 ${response.data.trim()}\n\n_Klik link di atas untuk membaca semua kenangan kita._ 📂`);
            } catch (error) {
                console.error("Gagal upload:", error);
                return msg.reply("❌ Gagal membuat link. Coba lagi nanti ya!");
            }
        }

        // FITUR 2: AI CHAT
        const userPrompt = args.join(' ');
        if (!userPrompt) return msg.reply(`🤖 Format salah. Contoh: \n!ai1 Jelaskan teori relativitas\n!sharechat (Buat link history)`);

        // Tier model
        const tier0 = [ "google/gemini-2.5-flash", "deepseek/deepseek-v3.2", "anthropic/claude-sonnet-4.5", "x-ai/grok-code-fast-1", "x-ai/grok-4.1-fast" ];
        const tier1 = [ "google/gemini-2.0-flash-lite-preview-02-05:free", "google/gemini-2.0-pro-exp-02-05:free", "deepseek/deepseek-r1:free", "deepseek/deepseek-v3:free", "meta-llama/llama-3.3-70b-instruct:free", "qwen/qwen-2.5-72b-instruct:free" ];
        const tier2 = [ "gryphe/mythomax-l2-13b:free", "sophosympatheia/midnight-rose-70b:free", "nousresearch/hermes-3-llama-3.1-405b:free" ];
        const tier3 = [ "deepseek/deepseek-r1-distill-llama-70b:free", "nvidia/llama-3.1-nemotron-70b-instruct:free", "mistralai/mistral-nemo:free", "microsoft/phi-3-medium-128k-instruct:free" ];

        // Pilih Tier
        let targetModels = [];
        let modeName = "";

        if (command === 'ai0') { targetModels = tier0; modeName = "💎 Algojo (Mode Priority)"; } 
        else if (command === 'ai1') { targetModels = tier1; modeName = "🧠 Algojo (Mode Pintar)"; } 
        else if (command === 'ai2') { targetModels = tier2; modeName = "🎭 Algojo (Mode Roleplay)"; } 
        else if (command === 'ai3') { targetModels = tier3; modeName = "⚡ Algojo (Mode Cepat)"; } 
        else { targetModels = [...tier0, ...tier1, ...tier2, ...tier3]; modeName = "Algojo AI"; }

        await msg.reply(`*${modeName} sedang berpikir...*`);
        msg.react('⏳');

        // Inisialisasi Memori & Archive
        if (!user.aiMemory) user.aiMemory = [];
        if (!user.aiFullHistory) user.aiFullHistory = []; 

        const messagesToSend = [
            { 
                role: "system", 
                content: "The AI embodies a professional English instructor who blends modern, Gen Z awareness with clear, structured teaching. It maintains a composed, confident tone while delivering direct, no-nonsense feedback. The AI focuses on helping the user improve practical English skills—speaking, writing, vocabulary, grammar, and real-life usage—by giving explanations that are concise, intuitive, and easy to apply. The AI corrects mistakes immediately, explains the “why,” and provides improved versions without being overly soft. It encourages the user to think critically and stay consistent, pushing them toward long-term fluency rather than shortcuts. The teacher is talkative enough to feel human, but never drifts into unnecessary rambling. The AI uses examples drawn from everyday contexts, modern expressions, and up-to-date English usage. It stays patient, but won’t hesitate to challenge the user when they’re playing too safe or repeating the same errors. Whenever the user practices sentences, the AI reviews them like a coach—firm, supportive, and precision-focused. The AI keeps the learning atmosphere chill, constructive, and forward-looking. Its goal is to make the user communicate like a natural English speaker, not just pass grammar tests." 
            },
            ...user.aiMemory,
            { role: "user", content: userPrompt }
        ];

        let success = false;

        for (const modelId of targetModels) {
            try {
                const completion = await client.chat.completions.create({
                    messages: messagesToSend,
                    model: modelId,
                });

                const answer = completion.choices[0].message.content;
                const timestamp = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });

                // A. Simpan Memori Pendek (Max 20)
                user.aiMemory.push({ role: "user", content: userPrompt });
                user.aiMemory.push({ role: "assistant", content: answer });
                if (user.aiMemory.length > 20) user.aiMemory = user.aiMemory.slice(-20);

                // B. Simpan Archive Selamanya
                user.aiFullHistory.push({
                    role: "user",
                    content: userPrompt,
                    date: timestamp
                });
                user.aiFullHistory.push({
                    role: "assistant",
                    content: answer,
                    date: timestamp,
                    model: modelId
                });

                // Simpan DB
                const { saveDB } = require('../helpers/database');
                saveDB(db);

                msg.reply(`*Algojo menjawab:* \n\n${answer}`);
                msg.react('✅');
                success = true;
                console.log(`✅ Sukses pakai model: ${modelId}`);
                break; 

            } catch (error) {
                console.log(`⚠️ Skip ${modelId}: ${error.message}`);
                continue; 
            }
        }

        if (!success) {
            msg.reply(`❌ Waduh, semua model di kategori ini sedang sibuk. Coba pakai command lain (misal !ask atau !ai1) ya Mas!`);
            msg.react('❌');
        }
    }

};
