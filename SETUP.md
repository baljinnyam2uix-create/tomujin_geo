# Tomujin LMS v2 — тохируулах заавар

## 1. Шууд Demo горимоор шалгах
Netlify-д энэ хавтсыг deploy хийхэд Supabase холбоогүй байсан ч demo горим ажиллана.

Demo хэрэглэгчид:
- Сурагч: `student@demo.mn` / `student123`
- Багш: `teacher@demo.mn` / `teacher123`
- Админ: `admin@demo.mn` / `admin123`

Нэвтрэх ба бүртгүүлэх нэг хаягтай: `/auth`.
Бүртгүүлэх үед Багш / Сурагч сонгоно. Нэвтрэх үед систем хадгалсан role-оор багшийг `/teacher`, сурагчийг `/student` руу автоматаар оруулна. Админ тусдаа `/admin` хаягаар нэвтэрнэ.

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
update public.profiles set role='admin' where email='YOUR_ADMIN_EMAIL@example.mn';
```
дараа нь `/admin` дээр нэвтэрнэ.

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
API key browser руу оруулахгүй; `netlify/functions/ai-teacher.js` server function ашиглана.

Netlify дээр:
1. Project > Site configuration > Environment variables нээнэ.
2. `OPENAI_API_KEY` нэртэй environment variable үүсгээд API key оруулна.
3. `SUPABASE_URL` = өөрийн Supabase Project URL.
4. `SUPABASE_ANON_KEY` (эсвэл `SUPABASE_PUBLISHABLE_KEY`) = browser талд ашиглаж буй Supabase public key.
5. Сонголтоор `OPENAI_MODEL` = `gpt-5.6` тохируулж болно.
6. Functions build хийхийн тулд энэ төслийг Git repository-оос Netlify-д холбоод deploy хийх нь хамгийн найдвартай. `netlify.toml` functions folder-ийг заасан.

AI function нь Supabase access token-оор нэвтэрсэн идэвхтэй **сурагч** мөн эсэхийг шалгана. OpenAI руу сурагчийн нэр, и-мэйл илгээхгүй; зөвхөн ангийн түвшин, асуулт, богино chat history ашиглана.
Сурагчдад зориулсан AI учраас production ашиглалтад насанд тохирсон disclosure, content filtering, monitoring/reporting болон хэрэглэж буй улсын хүүхэд хамгаалал/нууцлалын шаардлагыг тусад нь хэрэгжүүлэх шаардлагатай.

## 5. Route-ууд
- `/` — Нүүр
- `/auth` — Нэвтрэх / Бүртгүүлэх
- `/teacher` — Багш
- `/student` — Сурагч
- `/admin` — Админ
- `/student-auth` — хуучин холбоос; `/auth` руу шилжинэ
