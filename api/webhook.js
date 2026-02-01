const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

export default async function handler(req, res) {
  // Fitur Cron Job untuk kirim otomatis tiap jam 9, 12, 15, 18
 if (req.query.action === 'cron') {
    // Masukkan semua ID grup Mas Ecky di dalam kurung siku ini, dipisahkan koma
    const LIST_GRUP = [
      "-100123456789", 
      "-100987654321",
      "-100554433221"
    ]; 

    try {
      const data = await getSheetData();
      
      // Bot akan mengirim satu per satu ke semua grup di daftar
      for (const chatId of LIST_GRUP) {
        await sendTelegram(chatId, data);
      }
      
      return res.status(200).send('Cron Success to all groups');
    } catch (err) {
      console.error("Cron Error:", err);
      return res.status(500).send('Cron Error: ' + err.message);
    }
  }
      return res.status(500).send('Cron Error: ' + err.message);
    }
  }

  if (req.method !== 'POST') return res.status(200).send('Bot is running...');

  const update = req.body;
  if (update.message && update.message.text) {
   const msgText = update.message.text;

    if (msgText === '/start' || msgText === '/cek') {
      try {
        const data = await getSheetData();
        await sendTelegram(chatId, data);
      } catch (err) {
        await sendTelegram(chatId, "❌ Error: " + err.message);
      }
    } 
    // Perintah baru untuk cek ID Grup
    else if (msgText === '/id' || msgText === '/id@UsernameBotAnda') {
      await sendTelegram(chatId, `🆔 ID Chat ini adalah: <code>${chatId}</code>`);
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
    scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive.readonly'],
  });

  const doc = new GoogleSpreadsheet('1d0mU2ND5xZNT0VT5wWVGnbyIM4ladD7TgRs4zaDkjeM', auth);
  await doc.loadInfo();
  const sheet = doc.sheetsByTitle['PVT FFG BGES'];
  await sheet.loadCells('U900:Z926'); 

  let result = "<b>📊 LAPORAN DATA (PVT FFG BGES)</b>\n\n";

  for (let r = 900; r <= 925; r++) {
    const noInternet = sheet.getCell(r, 20).formattedValue || "-";
    const nama = sheet.getCell(r, 21).formattedValue || "-";
    const status = sheet.getCell(r, 22).formattedValue || "-";
    const tanggal = sheet.getCell(r, 23).formattedValue || "-";
    const redaman = sheet.getCell(r, 24).formattedValue || "-";
    const hasil = sheet.getCell(r, 25).formattedValue || "-";

    // --- LOGIKA IKON BARU MAS ECKY ---
    let iconHasil = hasil; 
    if (hasil === "OFFLINE" && status === "DYING GASP") {
      iconHasil = `⚠️ ${hasil}`;
    } else if (hasil === "SPEK" && status === "ONLINE") {
      iconHasil = `✅ ${hasil}`;
    } else if (hasil === "OFFLINE" && status === "LOS") {
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
