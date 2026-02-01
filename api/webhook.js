const { GoogleSpreadsheet } = require('google-spreadsheet');
const serviceAccountAuth = new JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  // Kode ini akan merapikan format key yang berantakan dari env
  key: process.env.GOOGLE_PRIVATE_KEY.split(String.raw`\n`).join('\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const TOKEN = process.env.BOT_TOKEN;
  const update = req.body;

  if (update.message && update.message.text) {
    const chatId = update.message.chat.id;
    const text = update.message.text;

    if (text === '/start' || text === '/cek') {
      try {
        const data = await getSheetData();
        await sendTelegram(chatId, data);
      } catch (err) {
        await sendTelegram(chatId, "Error: " + err.message);
      }
    }
  }

  return res.status(200).send('OK');
}

async function getSheetData() {
  // Auth ke Google
  const serviceAccountAuth = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Fix newline key
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const doc = new GoogleSpreadsheet('1d0mU2ND5xZNT0VT5wWVGnbyIM4ladD7TgRs4zaDkjeM', serviceAccountAuth);
  await doc.loadInfo();
  
  const sheet = doc.sheetsByTitle['PVT FFG BGES'];
  // Range U900:Z926 -> Baris 900-926 (index 899-925), Kolom U-Z (21-26)
  await sheet.loadCells('U900:Z926'); 

  let result = "<b>📊 LAPORAN DATA</b>\n\n";
  result += "<code>";

  for (let r = 899; r <= 925; r++) {
    let rowValues = [];
    for (let c = 20; c <= 25; c++) { // Kolom U(20) sampai Z(25)
      const cellValue = sheet.getCell(r, c).formattedValue || "-";
      rowValues.push(cellValue.toString().padEnd(8));
    }
    
    let line = rowValues.join(" | ") + "\n";
    result += line;
    
    // Header divider (baris 900)
    if (r === 899) result += "-".repeat(line.length) + "\n";
  }

  result += "</code>";
  return result;
}

async function sendTelegram(chatId, text) {
  const url = `https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML'
    })
  });
}
