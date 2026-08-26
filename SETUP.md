# Tomujin LMS v2 — тохируулах заавар

## 1. Шууд Demo горимоор шалгах
Netlify-д энэ хавтсыг deploy хийхэд Supabase холбоогүй байсан ч demo горим ажиллана.

Demo хэрэглэгчид:
- Сурагч: `student@demo.mn` / `student123`
- Багш: `teacher@demo.mn` / `teacher123`
- Админ: `admin@demo.mn` / `admin123`

Нэвтрэх ба бүртгүүлэх нэг хаягтай: `/auth`.
Бүртгүүлэх үед Багш / Сурагч сонгоно. Шинэ бүртгэл `pending` төлөвтэй үүсэж, админ `/admin` хэсгээс **Батлах** товч дарсны дараа л нэвтрэх эрхтэй болно. Батлагдсан хэрэглэгчийг систем role-оор нь `/teacher` эсвэл `/student` руу автоматаар оруулна. Админ тусдаа `/admin` хаягаар нэвтэрнэ.

## 2. Supabase холбоод жинхэнэ олон хэрэглэгчтэй болгох
1. Supabase дээр шинэ project үүсгэнэ.
2. SQL Editor нээгээд `supabase-schema.sql`-ийн бүх SQL-ийг ажиллуулна.
3. Project Settings > API-аас Project URL болон publishable/anon key авна.
4. `config.js` дотор URL болон key-гээ оруулна.
5. `service_role` secret key-г browser талын кодонд ХЭЗЭЭ Ч бүү оруул.
6. Сайтаа Netlify-д дахин deploy хийнэ.

### Анхны админ
Эхлээд `/auth` дээр энгийн бүртгэл үүсгээд SQL Editor дээр:
```sql
update public.profiles
set role='admin', status='active', approved_at=now()
where email='YOUR_ADMIN_EMAIL@example.mn';
```
дараа нь `/admin` дээр нэвтэрнэ.

### Бүртгэл баталгаажуулах урсгал
1. Багш эсвэл сурагч `/auth?mode=register` дээр бүртгэл үүсгэнэ.
2. `profiles.status = 'pending'` гэж хадгалагдана.
3. Хэрэглэгч энэ үед нэвтрэх оролдлого хийвэл систем админы баталгаажуулалт хүлээгдэж байгааг мэдэгдээд session-ийг хаана.
4. Админ `/admin` > **Баталгаажуулах хүсэлтүүд** хэсгээс **Батлах** эсвэл **Татгалзах** сонголт хийнэ.
5. Баталбал `status='active'` болж тухайн хэрэглэгч нэвтрэх боломжтой болно.

> Хуучин Supabase project дээр шинэ хувилбар тавьж байгаа бол шинэ `supabase-schema.sql`-ийг SQL Editor дээр дахин бүтнээр нь ажиллуулна. Скрипт нь `IF NOT EXISTS` болон constraint update ашигладаг тул одоогийн хүснэгтүүдийг upgrade хийхээр бичигдсэн.

## 3. Дүн ба сурагчийн ахиц
Багш даалгавар/шалгалт нэмэхдээ:
- Дээд оноо
- Эцсийн дүнд эзлэх жин (%)
тохируулна.

`/teacher` > **Дүн ба ахиц** хэсэгт:
- хичээл/материалыг анх нээсэн цаг
- сүүлд нээсэн цаг
- даалгавар/шалгалт болон материал гүйцэтгэсэн цаг
- оноо
- багшийн тайлбар
- тооцоолсон нийлбэр дүн
харагдана.

**Excel татах** товч нь `.xlsx` файл үүсгэж, `Дүн ба шалгалт` болон `Үзсэн хугацаа` гэсэн 2 sheet-ээр нэгтгэнэ. CDN ачаалагдахгүй үед CSV fallback ашиглана.

## 4. AI чат багш
Frontend нь `/student` > **AI чат багш** хэсэгт бэлэн.
API key browser руу ХЭЗЭЭ Ч орохгүй; зөвхөн server function дээр байна:
- Vercel — `api/ai-teacher.js`
- Netlify — `netlify/functions/ai-teacher.js`

Frontend эхлээд `/api/ai-teacher`, олдохгүй бол `/.netlify/functions/ai-teacher` рүү хандана.

### Vercel дээр тохируулах
1. Vercel > төслөө сонгох > **Settings** > **Environment variables**.
2. Дараах 3 хувьсагчийг нэмнэ (Production, Preview, Development бүгдэд нь):

| Нэр | Утга |
|---|---|
| `OPENAI_API_KEY` | platform.openai.com-оос авсан API key |
| `SUPABASE_URL` | Supabase Project URL |
| `SUPABASE_ANON_KEY` | `config.js` дотор байгаа publishable/anon key |

3. Сонголтоор `OPENAI_MODEL` (анхдагч нь `gpt-4o-mini`).
4. **Deployments** > сүүлийн deploy > **Redeploy** дарна. Environment variable нэмсний дараа заавал дахин deploy хийх шаардлагатай.

> `OPENAI_API_KEY` нь төлбөртэй. platform.openai.com > Billing дээр карт холбож, хэрэглээний хязгаар (usage limit) тавихыг зөвлөж байна.

AI function нь Supabase access token-оор нэвтэрсэн идэвхтэй **сурагч** мөн эсэхийг шалгана (багш, админ хандах эрхгүй). OpenAI руу сурагчийн нэр, и-мэйл илгээхгүй; зөвхөн ангийн түвшин, асуулт, богино chat history ашиглана.

Сурагчдад зориулсан AI учраас production ашиглалтад насанд тохирсон disclosure, content filtering, monitoring/reporting болон хэрэглэж буй улсын хүүхэд хамгаалал/нууцлалын шаардлагыг тусад нь хэрэгжүүлэх шаардлагатай.

## 5. Route-ууд
- `/` — Нүүр
- `/auth` — Нэвтрэх / Бүртгүүлэх
- `/teacher` — Багш
- `/student` — Сурагч
- `/admin` — Админ
- `/student-auth` — хуучин холбоос; `/auth` руу шилжинэ
