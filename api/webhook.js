const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

export default async function handler(req, res) {
  const fullUrl = new URL(req.url, `https://${req.headers.host}`);
  if (fullUrl.searchParams.get('action') === 'cron') {
    const LIST_GRUP = ["-5126863127", "-1002447926214"]; 
    try {
      const data = await getSheetData();
      for (const id of LIST_GRUP) { await sendTelegram(id, data); }
      return res.status(200).send('Cron Success');
    } catch (err) { return res.status(500).send(err.message); }
  }

  if (req.method !== 'POST') return res.status(200).send('Bot is running...');

  const update = req.body;
  if (update.message && update.message.text) {
    const chatId = update.message.chat.id;
    if (update.message.text === '/start' || update.message.text === '/cek') {
      try {
        const data = await getSheetData();
        await sendTelegram(chatId, data);
      } catch (err) {
        await sendTelegram(chatId, "❌ <b>Error:</b> " + err.message);
      }
    } else if (update.message.text.startsWith('/id')) {
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
  
  // Ambil semua baris. Header otomatis dianggap baris pertama (U899)
  const rows = await sheet.getRows({ offset: 898 }); // Mulai baca dari baris data setelah header (U900)
  
  // Untuk Update At, kita ambil manual dari cell AB899 (Header Area)
  await sheet.loadCells('u900:AB');
  const updatedAt = sheet.getCellByA1('u900').formattedValue || "-";

  let result = "<b>📊 UKUR HARIAN WIFI KOMINFO</b>\n";
  result += `🕒 <i>Update at: ${updatedAt}</i>\n\n`;

  let countSpek = 0, countUnspek = 0, countOffline = 0;

  for (const row of rows) {
    const noInternet = row.get('No internet'); // Nama kolom harus persis dengan header di Sheet
    if (!noInternet) continue; 

    const nama = row.get('Nama Pelanggan') || "-";
    const statusVal = (row.get('Status Layanan') || "").toString().toUpperCase();
    const tanggal = row.get('Tanggal Ukur') || "-";
    const redaman = row.get('Redaman') || "-";
    const hasilVal = (row.get('HASIL UKUR') || "").toString().toUpperCase();

    let iconHasil = hasilVal || "-"; 

    if (hasilVal.includes("UNSPEK")) {
      iconHasil = `⚠️ ${hasilVal}`;
      countUnspek++;
    } else if (hasilVal.includes("SPEK")) {
      iconHasil = `✅ ${hasilVal}`;
      countSpek++;
    } else if (hasilVal.includes("OFFLINE")) {
      countOffline++;
      if (statusVal.includes("DYING") || statusVal.includes("GASP")) iconHasil = `⚠️ ${hasilVal}`;
      else if (statusVal.includes("LOS")) iconHasil = `❌ ${hasilVal}`;
      else iconHasil = `❌ ${hasilVal}`;
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
  result += `\n<i>Semangat kerjanya! 🚀</i>`;

  return result;
}

async function sendTelegram(chatId, text) {
  return await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: 'HTML' })
  });
}
