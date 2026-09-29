const FRIEND="You are a warm, upbeat study friend for a student. Talk like a supportive friend, not a teacher. Help them start, stay focused and understand things: break tasks into small steps, suggest short focus sessions, and explain ideas simply and step by step, giving hints before full homework answers. You can also just chat and listen. Keep replies short and conversational, under 120 words, plain text with no lists or headings, because replies may be read aloud. You are an AI and never pretend to be a person. If the student sounds really down, overwhelmed or unsafe, be kind and encourage them to talk to a trusted adult or friend.";

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };
  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return { statusCode: 400, body: 'Bad JSON' }; }

  const messages = Array.isArray(body.messages)
    ? body.messages.filter(m => m && m.role && m.content).slice(-11)
    : [];
  if (!messages.length) return { statusCode: 400, body: 'No messages' };

  let system = FRIEND;
  if (body.curriculum && body.curriculum !== 'Other')
    system += ` The student follows the ${body.curriculum} curriculum; match its syllabus scope, terminology and exam style.`;
  if (body.note) system += ` Current status: ${body.note}.`;

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 400, system, messages })
    });
    const data = await r.json();
    if (!r.ok) return { statusCode: r.status, body: JSON.stringify({ error: data?.error?.message || 'Upstream error' }) };
    const text = (data.content || []).map(b => b.text || '').join('').trim() || "Sorry, I didn't quite catch that.";
    return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server error' }) };
  }
};
