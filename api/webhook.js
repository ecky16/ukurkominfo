const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(200).send('Bot is running...');
  }

  const update = req.body;

  if (update.message && update.message.text) {
    const chatId = update.message.chat.id;
    const text = update.message.text;

    if (text === '/start' || text === '/cek') {
      try {
        const data = await getSheetData();
        await sendTelegram(chatId, data);
      } catch (err) {
        console.error("Error Detail:", err);
        await sendTelegram(chatId, "❌ Error: " + err.message);
      }
    }
  }

  return res.status(200).send('OK');
}

async function getSheetData() {
  const privateKey = process.env.GOOGLE_PRIVATE_KEY.split(String.raw`\n`).join('\n');
  
  const auth = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: privateKey,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.readonly'
    ],
  });

  const doc = new GoogleSpreadsheet('1d0mU2ND5xZNT0VT5wWVGnbyIM4ladD7TgRs4zaDkjeM', auth);
  await doc.loadInfo();
  const sheet = doc.sheetsByTitle['PVT FFG BGES'];
  
  // Ambil range U900:Z926
  await sheet.loadCells('U900:Z926'); 

  let result = "<b>📊 LAPORAN DATA (PVT FFG BGES)</b>\n\n";

  // Kita mulai dari baris 901 (index 900) karena baris 900 (index 899) adalah header
  for (let r = 900; r <= 925; r++) {
    const noInternet = sheet.getCell(r, 20).formattedValue || "-";
    const nama = sheet.getCell(r, 21).formattedValue || "-";
    const status = sheet.getCell(r, 22).formattedValue || "-";
    const tanggal = sheet.getCell(r, 23).formattedValue || "-";
    const redaman = sheet.getCell(r, 24).formattedValue || "-";
    const hasil = sheet.getCell(r, 25).formattedValue || "-";

    // Format List Vertikal agar rapi di layar HP
    result += `🆔 <code>${noInternet}</code>\n`;
    result += `👤 <b>${nama}</b>\n`;
    result += `📡 Status: <code>${status}</code> | 🗓 ${tanggal}\n`;
    result += `📉 Redaman: <code>${redaman}</code> | ✅ ${hasil}\n`;
    result += `────────────────────\n`;
  }

  return result;
}

async function sendTelegram(chatId, text) {
  const url = `https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML'
      })
    });
  } catch (e) {
    console.error("Fetch Error:", e);
  }
}
