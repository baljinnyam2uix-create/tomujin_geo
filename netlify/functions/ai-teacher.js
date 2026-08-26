exports.handler = async (event) => {
  const json = (statusCode, body) => ({ statusCode, headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(body) });
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const apiKey = process.env.OPENAI_API_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!apiKey) return json(503, { error: 'OPENAI_API_KEY тохируулаагүй байна.' });
  if (!supabaseUrl || !supabaseKey) return json(503, { error: 'AI authentication-д SUPABASE_URL болон SUPABASE_ANON_KEY/PUBLISHABLE_KEY шаардлагатай.' });

  try {
    const auth = String(event.headers.authorization || event.headers.Authorization || '');
    const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
    if (!token) return json(401, { error: 'AI багш ашиглахын тулд нэвтэрсэн байх шаардлагатай.' });

    const userRes = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/user`, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${token}` }
    });
    const user = await userRes.json().catch(() => ({}));
    if (!userRes.ok || !user?.id) return json(401, { error: 'Нэвтрэлтийн хугацаа дууссан байна. Дахин нэвтэрнэ үү.' });

    const profileRes = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=role,grade,status`, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${token}`, Accept: 'application/json' }
    });
    const profiles = await profileRes.json().catch(() => []);
    const profile = Array.isArray(profiles) ? profiles[0] : null;
    if (!profile || profile.role !== 'student' || profile.status !== 'active') return json(403, { error: 'AI чат багш зөвхөн идэвхтэй сурагчийн бүртгэлд нээлттэй.' });

    const body = JSON.parse(event.body || '{}');
    const message = String(body.message || '').trim().slice(0, 4000);
    const grade = String(profile.grade || '7').replace(/[^0-9]/g, '').slice(0, 2);
    const history = Array.isArray(body.history)
      ? body.history.slice(-8).map(x => ({ role: x.role === 'assistant' ? 'assistant' : 'user', content: String(x.content || '').slice(0, 2500) }))
      : [];
    if (!message) return json(400, { error: 'Асуулт хоосон байна.' });

    const system = `Та 7–12-р ангийн сурагчдад зориулсан Монгол хэлтэй газарзүйн AI багш. Одоогийн сурагч ${grade}-р анги. Насанд тохирсон, ойлгомжтой, эелдэг, богино хэсгүүдээр тайлбарла. Зөвхөн сургалтын зорилготой тусал. Боломжтой бол ойлголтыг жишээ, алхам, асуултаар бататга. Даалгавар/шалгалтын бэлэн хариуг шууд хуулж өгөхийн оронд бодох арга, чиглүүлэг өг. Хувийн нууц мэдээлэл асуухгүй. Аюултай эсвэл насанд тохироогүй агуулгыг дэлгэрүүлэхгүй. Мэдэхгүй зүйлээ зохиохгүй, эргэлзээтэй бол хэл.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [{ role: 'system', content: system }, ...history.filter(x => x.content), { role: 'user', content: message }],
        max_tokens: 900,
        temperature: 0.4
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error?.message || 'OpenAI API алдаа');

    const answer = data?.choices?.[0]?.message?.content?.trim();
    if (!answer) throw new Error('AI хариу хоосон ирлээ.');
    return json(200, { answer });
  } catch (err) {
    return json(500, { error: err.message || 'AI үйлчилгээний алдаа' });
  }
};
