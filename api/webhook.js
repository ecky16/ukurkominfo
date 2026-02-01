const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

export default async function handler(req, res) {
  // 1. Logika Cron Job (Untuk jam 9, 12, 15, 18 via Apps Script)
  const fullUrl = new URL(req.url, `https://${req.headers.host}`);
  if (fullUrl.searchParams.get('action') === 'cron') {
    const LIST_GRUP = ["-5126863127", "-1002447926214"]; 
    try {
      const data = await getSheetData();
      for (const id of LIST_GRUP) {
        await sendTelegram(id, data);
      }
      return res.status(200).send('Cron Success');
    } catch (err) {
      return res.status(500).send('Cron Error: ' + err.message);
    }
  }

  // 2. Respon Bot Telegram Biasa
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
        await sendTelegram(chatId, "❌ <b>Error:</b> " + err.message);
      }
    } else if (msgText.startsWith('/id')) {
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
  
  // 1. CARA OTOMATIS: Cari baris terakhir yang ada isinya
  const rows = await sheet.getRows(); 
  // Kita mulai dari baris 900 (index 898 karena di script mulai dari 0)
  const startRow = 899; 
  const lastRow = sheet.rowCount;

  // 2. Load cells secara dinamis sampai baris paling bawah
  await sheet.loadCells(`U${startRow + 1}:AB${lastRow}`); 
  
  const updatedAt = sheet.getCell(startRow - 1, 27).formattedValue || "-";

  let result = "<b>📊 UKUR HARIAN WIFI KOMINFO</b>\n";
  result += `🕒 <i>Update at: ${updatedAt}</i>\n\n`;

  let countSpek = 0, countUnspek = 0, countOffline = 0;

  // 3. Loop akan otomatis mengikuti jumlah baris yang ada
  for (let r = startRow; r < lastRow; r++) {
    const noInternet = sheet.getCell(r, 20).formattedValue;
    if (!noInternet) continue; // Kalau kosong, berhenti atau lewati

    const nama = sheet.getCell(r, 21).formattedValue || "-";
    const statusVal = (sheet.getCell(r, 22).formattedValue || "").toString().toUpperCase();
    const tanggal = sheet.getCell(r, 23).formattedValue || "-";
    const redaman = sheet.getCell(r, 24).formattedValue || "-";
    const hasilVal = (sheet.getCell(r, 25).formattedValue || "").toString().toUpperCase();

    let iconHasil = hasilVal || "-"; 

    // Logika Ikon & Hitung Rekap
    if (hasilVal.includes("UNSPEK")) {
      iconHasil = `⚠️ ${hasilVal}`;
      countUnspek++;
    } else if (hasilVal.includes("SPEK")) {
      iconHasil = `✅ ${hasilVal}`;
      countSpek++;
    } else if (hasilVal.includes("OFFLINE")) {
      countOffline++;
      if (statusVal.includes("DYING") || statusVal.includes("GASP")) {
        iconHasil = `⚠️ ${hasilVal}`;
      } else if (statusVal.includes("LOS")) {
        iconHasil = `❌ ${hasilVal}`;
      } else {
        iconHasil = `❌ ${hasilVal}`;
      }
    }

    result += `🆔 <code>${noInternet}</code>\n`;
    result += `👤 <b>${nama}</b>\n`;
    result += `📡 Status: <code>${statusVal}</code> | 🗓 ${tanggal}\n`;
    result += `📉 Redaman: <code>${redaman}</code> | ${iconHasil}\n`;
    result += `────────────────────\n`;
  }

  result += `\n<b>📝 RINGKASAN STATUS:</b>\n`;
  result += `✅ TOTAL SPEK: <b>${countSpek}</b>\n`;
  result += `⚠️ TOTAL UNSPEK: <b>${countUnspek}</b>\n`;
  result += `❌ TOTAL OFFLINE: <b>${countOffline}</b>\n`;
  result += `\n<i>semangat bekerja </i>`;

  return result;
}

async function sendTelegram(chatId, text) {
  return await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: 'HTML' })
  });
}
