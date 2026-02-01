const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

export default async function handler(req, res) {
  // 1. Fitur Cron Job untuk kirim otomatis (Jam 9, 12, 15, 18)
  if (req.query.action === 'cron') {
    const LIST_GRUP = [
      "-5126863127", 
      "-10014", // Contoh ID grup
      "-100xxxxxxxxxx"
    ]; 

    try {
      const data = await getSheetData();
      for (const chatId of LIST_GRUP) {
        await sendTelegram(chatId, data);
      }
      return res.status(200).send('Cron Success to all groups');
    } catch (err) {
      console.error("Cron Error:", err);
      return res.status(500).send('Cron Error: ' + err.message);
    }
  }

  // 2. Handler Telegram Normal
  if (req.method !== 'POST') return res.status(200).send('Bot is running...');

  const update = req.body;
  if (update.message && update.message.text) {
    const chatId = update.message.chat.id;
    const msgText = update.message.text;

    if (msgText === '/start' || msgText === '/cek') {
      try {
        const data = await getSheetData();
        await sendTelegram(chatId, data);
      } catch (err) {
        await sendTelegram(chatId, "❌ Error: " + err.message);
      }
    } 
    else if (msgText.startsWith('/id')) {
      await sendTelegram(chatId, `🆔 ID Chat ini adalah: <code>${chatId}</code>`);
    }
  }
  return res.status(200).send('OK');
}

async function getSheetData() {
  const privateKey = process.env.GOOGLE_PRIVATE_KEY.split(String.raw`\n`).join('\n');
  const auth = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive.readonly'],
  });

  const doc = new GoogleSpreadsheet('1d0mU2ND5xZNT0VT5wWVGnbyIM4ladD7TgRs4zaDkjeM', auth);
  await doc.loadInfo();
  const sheet = doc.sheetsByTitle['PVT FFG BGES'];
  
  // Pastikan ambil sampai AB (kolom ke-28)
  await sheet.loadCells('U900:AB926'); 

  // Ambil data Update At dari sel AB900 (Index baris 899, kolom 27)
  const updatedAt = sheet.getCell(899, 27).formattedValue || "-";

  let result = "<b>📊 UKUR HARIAN WIFI KOMINFO</b>\n";
  result += `🕒 <i>Update at: ${updatedAt}</i>\n\n`;

  for (let r = 900; r <= 925; r++) {
    const noInternet = sheet.getCell(r, 20).formattedValue || "-";
    const nama = sheet.getCell(r, 21).formattedValue || "-";
    const status = sheet.getCell(r, 22).formattedValue || "-";
    const tanggal = sheet.getCell(r, 23).formattedValue || "-";
    const redaman = sheet.getCell(r, 24).formattedValue || "-";
    const hasil = sheet.getCell(r, 25).formattedValue || "-";

    const hasilClean = (hasil || "").toString().replace(/\s+/g, '').toUpperCase();
    const statusClean = (status || "").toString().replace(/\s+/g, '').toUpperCase();

    let iconHasil = hasil; 
    
    // Logika pengecekan yang lebih kuat
    if (hasilClean === "OFFLINE" && statusClean === "DYINGGASP") {
      iconHasil = `⚠️ ${hasil}`;
    } else if (statusClean === "SPEK") {
      // Fokus ke status SPEK dulu untuk memancing centang hijau
      iconHasil = `✅ ${hasil}`;
    } else if (hasilClean === "OFFLINE" && statusClean === "LOS") {
      iconHasil = `❌ ${hasil}`;
    }

    result += `🆔 <code>${noInternet}</code>\n`;
    result += `👤 <b>${nama}</b>\n`;
    result += `📡 Status: <code>${status}</code> | 🗓 ${tanggal}\n`;
    result += `📉 Redaman: <code>${redaman}</code> | ${iconHasil}\n`;
    result += `────────────────────\n`;
  }
  return result;
}

async function sendTelegram(chatId, text) {
  await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: 'HTML' })
  });
}
