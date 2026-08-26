#!/usr/bin/env node
/**
 * Сурах бичгийн PDF-үүдийг Supabase руу оруулна (AI багш эдгээрээс тулгуурлан хариулна).
 *
 * Ажиллуулах:
 *   npm install pdf-parse
 *   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... OPENAI_API_KEY=... \
 *   node scripts/ingest-textbooks.js "C:/Users/Dell/Downloads/geo_mat"
 *
 * SUPABASE_SERVICE_KEY = Supabase > Settings > API > service_role key.
 * Энэ түлхүүрийг ЗӨВХӨН локалаар ашиглана; код дотор бүү бич, git-д бүү оруул.
 */
const fs = require('fs');
const path = require('path');

// ---- Файлын нэрийг ангитай холбох. Шинэ ном нэмбэл энд бүртгэнэ. ----
const GRADE_BY_FILE = {
  '07_gazargui.pdf': 7,
  '08_gazar_zui (1).pdf': 8,
  '08_gazar_zui.pdf': 8,
  '09_gazarzui.pdf': 9,
  '10_gazarzui.pdf': 10,
  '11_gazar_zui.pdf': 11
};

// ---- Хуучин (Unicode бус) монгол фонтын текстийг кирилл рүү хөрвүүлэх ----
// Ийм PDF-д кирилл үсэг Latin-1 кодоор хадгалагддаг: õ→х, ý→э, º→ө, ¿→ү ...
const LEGACY_MAP = {
  'à':'а','á':'б','â':'в','ã':'г','ä':'д','å':'е','¸':'ё','æ':'ж','ç':'з','è':'и',
  'é':'й','ê':'к','ë':'л','ì':'м','í':'н','î':'о','º':'ө','ï':'п','ð':'р','ñ':'с',
  'ò':'т','ó':'у','¿':'ү','ô':'ф','õ':'х','ö':'ц','÷':'ч','ø':'ш','ù':'щ','ú':'ъ',
  'û':'ы','ü':'ь','ý':'э','þ':'ю','ÿ':'я',
  'À':'А','Á':'Б','Â':'В','Ã':'Г','Ä':'Д','Å':'Е','¨':'Ё','Æ':'Ж','Ç':'З','È':'И',
  'É':'Й','Ê':'К','Ë':'Л','Ì':'М','Í':'Н','Î':'О','ª':'Ө','Ï':'П','Ð':'Р','Ñ':'С',
  'Ò':'Т','Ó':'У','¯':'Ү','Ô':'Ф','Õ':'Х','Ö':'Ц','×':'Ч','Ø':'Ш','Ù':'Щ','Ú':'Ъ',
  'Û':'Ы','Ü':'Ь','Ý':'Э','Þ':'Ю','ß':'Я'
};
const LEGACY_RE = new RegExp('[' + Object.keys(LEGACY_MAP).join('') + ']', 'g');
const countLegacy = s => (s.match(LEGACY_RE) || []).length;
// Мөр тус бүрээр шийднэ: зарим ном бүхэлдээ, зарим нь зөвхөн хэсэгчлэн хуучин кодлолтой.
// Зөв кирилл ба энгийн ASCII хүснэгтэд байхгүй тул хөндөгдөхгүй.
const decodeMongolian = t => t.split('\n')
  .map(l => (countLegacy(l) >= 3 ? l.replace(LEGACY_RE, c => LEGACY_MAP[c]) : l))
  .join('\n');

// ---- Текстийг хэсэгчлэх ----
const CHUNK = 1200, OVERLAP = 200;
function chunkText(text) {
  const clean = text.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  const out = [];
  for (let i = 0; i < clean.length; i += CHUNK - OVERLAP) {
    const piece = clean.slice(i, i + CHUNK).trim();
    // Хэт богино эсвэл агуулгагүй (гарчиг, цэгүүд) хэсгийг алгасана.
    if (piece.length < 250) continue;
    if ((piece.match(/[Ѐ-ӿ]/g) || []).length < piece.length * 0.25) continue;
    out.push(piece);
  }
  return out;
}

async function extractPdf(file) {
  const { PDFParse } = require('pdf-parse');
  const parser = new PDFParse({ data: new Uint8Array(fs.readFileSync(file)) });
  const r = await parser.getText();
  await parser.destroy();
  return r.text || '';
}

async function embedBatch(texts, apiKey) {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: texts })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Embedding алдаа: ${data?.error?.message || res.status}`);
  return data.data.map(d => d.embedding);
}

async function main() {
  const dir = process.argv[2];
  const { SUPABASE_URL, SUPABASE_SERVICE_KEY, OPENAI_API_KEY } = process.env;
  if (!dir) throw new Error('PDF хавтасны замыг аргумент болгож өгнө үү.');
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) throw new Error('SUPABASE_URL ба SUPABASE_SERVICE_KEY тохируулна уу.');
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY тохируулна уу.');
  const base = SUPABASE_URL.replace(/\/$/, '');

  const files = fs.readdirSync(dir).filter(f => GRADE_BY_FILE[f]);
  if (!files.length) throw new Error(`Бүртгэлтэй сурах бичиг олдсонгүй. Хавтас: ${dir}`);

  // Хуучин өгөгдлийг цэвэрлэнэ (дахин ажиллуулахад давхардахгүй).
  const del = await fetch(`${base}/rest/v1/textbook_chunks?id=neq.00000000-0000-0000-0000-000000000000`, {
    method: 'DELETE',
    headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` }
  });
  if (!del.ok) throw new Error(`Хуучин өгөгдөл устгаж чадсангүй: ${del.status} ${await del.text()}`);
  console.log('Хуучин өгөгдлийг цэвэрлэлээ.\n');

  let total = 0;
  for (const file of files) {
    const grade = GRADE_BY_FILE[file];
    process.stdout.write(`${file} (${grade}-р анги) ... `);
    const raw = await extractPdf(path.join(dir, file));
    const decoded = decodeMongolian(raw);
    const chunks = chunkText(decoded);
    process.stdout.write(`${chunks.length} хэсэг, `);

    for (let i = 0; i < chunks.length; i += 64) {
      const batch = chunks.slice(i, i + 64);
      const vectors = await embedBatch(batch, OPENAI_API_KEY);
      const rows = batch.map((content, j) => ({
        grade, source: file, page: null, content, embedding: vectors[j]
      }));
      const res = await fetch(`${base}/rest/v1/textbook_chunks`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal'
        },
        body: JSON.stringify(rows)
      });
      if (!res.ok) throw new Error(`Хадгалахад алдаа: ${res.status} ${await res.text()}`);
      total += rows.length;
    }
    console.log('хадгаллаа.');
  }
  console.log(`\nБэлэн. Нийт ${total} хэсэг оруулав.`);
}

main().catch(e => { console.error('\nАЛДАА:', e.message); process.exit(1); });
