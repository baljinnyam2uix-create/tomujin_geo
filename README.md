# Tomujin LMS v2

Нэгдсэн **Нэвтрэх / Бүртгүүлэх** урсгалтай боловсролын LMS.

Үндсэн боломжууд:
- Бүртгэл дээр **Сурагч / Багш** role сонгох
- Шинэ бүртгэлийг **админ баталсны дараа** идэвхжүүлэх (`pending → active`)
- Админд батлах / татгалзах хүсэлтийн тусгай самбар
- Батлагдсан хэрэглэгчийг role-оор сурагч/багшийн dashboard руу автоматаар оруулах
- Админы тусдаа `/admin` нэвтрэлт
- Багш хичээл, даалгавар, шалгалт, видео/PPT/Word/PDF/линк оруулах
- Даалгавар/шалгалтын дээд оноо ба эцсийн дүнгийн жинг багш өөрөө тохируулах
- Сурагчийн хичээл нээсэн, сүүлд үзсэн, гүйцэтгэсэн хугацааг багш харах
- Багш бүх сурагчийн дүн, шалгалт, activity-г Excel-ээр татах
- Сурагч өөрийн оноо, нийт дүн, багшийн тайлбарыг харах
- Сурагчийн AI чат багш
- Netlify + Supabase ашиглахад бэлэн бүтэц

Тохиргоог `SETUP.md`-ээс харна уу.

## v5 visual redesign
- Homepage redesigned from the provided geography reference image.
- Reference artwork is bundled locally in `assets/geography-hero-art.webp` (no expiring external URL).
- Login, registration and admin login use the same orange/teal/navy/pastel visual system.
- Existing Supabase authentication and admin approval logic is unchanged.


## v10 Tomujin geography redesign
- Header brand moved to the upper-right with the supplied Tomujin logo and “Tomujin alternative school” text.
- Primary UI palette is derived from the logo: teal, purple, yellow and orange.
- Homepage hero, course cards and map explorer now use geography / earth-science imagery, coordinates, map pins, compass, GIS and topographic motifs.
- Login, registration, student, teacher and admin screens use the same Tomujin visual system.
- Existing authentication, Supabase, role, grading and LMS JavaScript logic remains unchanged.


## v2 design fixes
- School logo moved to the upper-left.
- The Tomujin header/sidebar logo is embedded directly in the HTML as a JPEG data URI, so it does not depend on relative asset paths and will render reliably on root pages, nested routes, Netlify, localhost, and file previews.
- All Mongolian “Газарзүйн зураг” wording changed to “Газарзүйн зураг”.


### Logo reliability fix
- The Tomujin logo is embedded directly into each page as a `data:image/jpeg;base64,...` source.
- `assets/tomujin-logo.jpg` is retained as the original source asset for future design edits.
