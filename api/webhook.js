const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

export default async function handler(req, res) {
  if (req.query.action === 'cron') {
    const LIST_GRUP = ["-5126863127", "-1002447926214"]; 
    try {
      const data = await getSheetData();
      for (const chatId of LIST_GRUP) { await sendTelegram(chatId, data); }
      return res.status(200).send('Cron Success');
    } catch (err) { return res.status(500).send(err.message); }
  }

  if (req.method !== 'POST') return res.status(200).send('Bot is running...');

  const update = req.body;
  if (update.message && update.message.text) {
    const chatId = update.message.chat.id;
    const msgText = update.message.text;

    if (msgText === '/start' || msgText === '/cek') {
      try {
        const data = await getSheetData();
        await sendTelegram(chatId, data);
      } catch (err) { await sendTelegram(chatId, "❌ Error: " + err.message); }
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
  
  // Ambil range U sampai AB
  await sheet.loadCells('U900:AB926'); 
  const updatedAt = sheet.getCell(899, 27).formattedValue || "-";

  let result = "<b>📊 UKUR HARIAN WIFI KOMINFO</b>\n";
  result += `🕒 <i>Update at: ${updatedAt}</i>\n\n`;

  for (let r = 900; r <= 925; r++) {
    const noInternet = sheet.getCell(r, 20).formattedValue || "-"; // Kolom U
    const nama = sheet.getCell(r, 21).formattedValue || "-";       // Kolom V
    const status = sheet.getCell(r, 22).formattedValue || "-";     // Kolom W (Status Layanan)
    const tanggal = sheet.getCell(r, 23).formattedValue || "-";    // Kolom X
    const redaman = sheet.getCell(r, 24).formattedValue || "-";    // Kolom Y
    const hasil = sheet.getCell(r, 25).formattedValue || "-";      // Kolom Z (HASIL UKUR)

    let iconHasil = hasil; 
    
    // LOGIKA PERBAIKAN: Cek kata SPEK di variabel 'hasil' (Kolom Z)
    const hasilClean = String(hasil).toUpperCase();
    const statusClean = String(status).toUpperCase();

    if (hasilClean.includes("SPEK")) {
      iconHasil = `✅ ${hasil}`;
    } else if (hasilClean.includes("OFFLINE")) {
      // Cek apakah OFFLINE karena DYING GASP atau LOS
      if (statusClean.includes("DYING") || statusClean.includes("GASP")) {
        iconHasil = `⚠️ ${hasil}`;
      } else if (statusClean.includes("LOS")) {
        iconHasil = `❌ ${hasil}`;
      } else {
        iconHasil = `❌ ${hasil}`;
      }
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
