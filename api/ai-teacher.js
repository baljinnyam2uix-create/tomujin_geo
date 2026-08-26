// Vercel serverless function — AI багш (сурагчид зориулсан газарзүйн туслах).
// API key нь зөвхөн server талд байна; browser руу хэзээ ч илгээхгүй.
module.exports = async (req, res) => {
  const send = (status, body) => res.status(status).json(body);
  if (req.method !== 'POST') return send(405, { error: 'Method not allowed' });

  const apiKey = process.env.OPENAI_API_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!apiKey) return send(503, { error: 'OPENAI_API_KEY тохируулаагүй байна. Vercel > Settings > Environment Variables дээр нэмнэ үү.' });
  if (!supabaseUrl || !supabaseKey) return send(503, { error: 'SUPABASE_URL болон SUPABASE_ANON_KEY тохируулаагүй байна.' });

  try {
    const auth = String(req.headers.authorization || req.headers.Authorization || '');
    const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
    if (!token) return send(401, { error: 'AI багш ашиглахын тулд нэвтэрсэн байх шаардлагатай.' });

    const base = supabaseUrl.replace(/\/$/, '');

    // 1. Токеноор хэрэглэгчийг таних
    const userRes = await fetch(`${base}/auth/v1/user`, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${token}` }
    });
    const user = await userRes.json().catch(() => ({}));
    if (!userRes.ok || !user?.id) return send(401, { error: 'Нэвтрэлтийн хугацаа дууссан байна. Дахин нэвтэрнэ үү.' });

    // 2. Зөвхөн идэвхтэй сурагч ашиглана
    const profileRes = await fetch(
      `${base}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=role,grade,status`,
      { headers: { apikey: supabaseKey, Authorization: `Bearer ${token}`, Accept: 'application/json' } }
    );
    const profiles = await profileRes.json().catch(() => []);
    const profile = Array.isArray(profiles) ? profiles[0] : null;
    if (!profile || profile.role !== 'student' || profile.status !== 'active') {
      return send(403, { error: 'AI чат багш зөвхөн идэвхтэй сурагчийн бүртгэлд нээлттэй.' });
    }

    // 3. Оролтыг цэвэрлэх
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const message = String(body.message || '').trim().slice(0, 4000);
    if (!message) return send(400, { error: 'Асуулт хоосон байна.' });
    const grade = String(profile.grade || '7').replace(/[^0-9]/g, '').slice(0, 2);
    const history = Array.isArray(body.history)
      ? body.history
          .slice(-8)
          .map(x => ({ role: x.role === 'assistant' ? 'assistant' : 'user', content: String(x.content || '').slice(0, 2500) }))
          .filter(x => x.content)
      : [];

    const system = `Та 7–12-р ангийн сурагчдад зориулсан Монгол хэлтэй газарзүйн AI багш. Одоогийн сурагч ${grade}-р анги. Насанд тохирсон, ойлгомжтой, эелдэг, богино хэсгүүдээр тайлбарла. Зөвхөн сургалтын зорилготой тусал. Боломжтой бол ойлголтыг жишээ, алхам, асуултаар бататга. Даалгавар/шалгалтын бэлэн хариуг шууд хуулж өгөхийн оронд бодох арга, чиглүүлэг өг. Хувийн нууц мэдээлэл асуухгүй. Аюултай эсвэл насанд тохироогүй агуулгыг дэлгэрүүлэхгүй. Мэдэхгүй зүйлээ зохиохгүй, эргэлзээтэй бол хэл.`;

    // 4. OpenAI руу дуудах
    const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [{ role: 'system', content: system }, ...history, { role: 'user', content: message }],
        max_tokens: 900,
        temperature: 0.4
      })
    });
    const data = await aiRes.json().catch(() => ({}));
    if (!aiRes.ok) {
      // Жинхэнэ алдааг зөвхөн лог руу; сурагчид ойлгомжтой мэдэгдэл харуулна.
      const code = data?.error?.code || data?.error?.type || '';
      console.error('OpenAI error', aiRes.status, code, data?.error?.message);
      let msg = 'AI багш түр ажиллахгүй байна. Хэсэг хугацааны дараа дахин оролдоно уу.';
      if (code === 'insufficient_quota') msg = 'AI багшийн ашиглалтын эрх дууссан байна. Сургуулийн админд мэдэгдэнэ үү.';
      else if (aiRes.status === 429) msg = 'Хүсэлт хэт олон ирлээ. Хэдэн секунд хүлээгээд дахин оролдоно уу.';
      else if (aiRes.status === 401 || aiRes.status === 403) msg = 'AI үйлчилгээний тохиргоо буруу байна. Сургуулийн админд мэдэгдэнэ үү.';
      return send(502, { error: msg });
    }

    const answer = data?.choices?.[0]?.message?.content?.trim();
    if (!answer) return send(502, { error: 'AI хариу хоосон ирлээ.' });
    return send(200, { answer });
  } catch (err) {
    console.error('ai-teacher failed', err);
    return send(500, { error: err.message || 'AI үйлчилгээний алдаа' });
  }
};
