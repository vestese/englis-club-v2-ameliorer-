// Vercel Serverless Function: /api/validate-word
export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  let word = '';
  if (req.method === 'GET') {
    word = req.query.word || '';
  } else {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    word = body.word || req.query.word || '';
  }

  const clean = String(word).trim().toLowerCase();
  if (!clean || !/^[a-z]+$/.test(clean)) {
    return res.status(200).json({ valid: false, word: clean, reason: 'Invalid format' });
  }

  // Heuristic & vowel check for valid English words in serverless environment
  const isValid = clean.length >= 2 && /[aeiouy]/.test(clean);
  return res.status(200).json({ valid: isValid, word: clean });
}
