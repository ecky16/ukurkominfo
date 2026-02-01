const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

export default async function handler(req, res) {
  // Handler untuk pemicu otomatis (nanti dipanggil dari Apps Script)
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
  
  await sheet.loadCells('U900:AB926'); 
  const updatedAt = sheet.getCell(899, 27).formattedValue || "-";

  let result = "<b>📊 UKUR HARIAN WIFI KOMINFO</b>\n";
  result += `🕒 <i>Update at: ${updatedAt}</i>\n\n`;

for (let r = 900; r <= 925; r++) {
    const noInternet = sheet.getCell(r, 20).formattedValue || "-";
    const nama = sheet.getCell(r, 21).formattedValue || "-";
    
    // Ambil nilai, ubah ke String, buang semua spasi dan karakter aneh
    const statusRaw = sheet.getCell(r, 22).formattedValue || "";
    const statusClean = String(statusRaw).toUpperCase().replace(/[^A-Z0-9]/g, ''); 
    
    const tanggal = sheet.getCell(r, 23).formattedValue || "-";
    const redaman = sheet.getCell(r, 24).formattedValue || "-";
    const hasilRaw = sheet.getCell(r, 25).formattedValue || "";
    const hasilClean = String(hasilRaw).toUpperCase().replace(/[^A-Z0-9]/g, '');

    let iconHasil = hasilRaw || "-"; 
    
    // Logika pengecekan yang sangat ketat terhadap isi teks
    if (statusClean.includes("SPEK")) {
      iconHasil = `✅ ${hasilRaw}`;
    } else if (statusClean.includes("DYING") || statusClean.includes("GASP")) {
      iconHasil = `⚠️ ${hasilRaw}`;
    } else if (statusClean.includes("LOS")) {
      iconHasil = `❌ ${hasilRaw}`;
    }

    result += `🆔 <code>${noInternet}</code>\n`;
    result += `👤 <b>${nama}</b>\n`;
    result += `📡 Status: <code>${statusRaw}</code> | 🗓Tgl Update ${tanggal}\n`;
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
