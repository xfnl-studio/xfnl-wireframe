// GitHub OAuth, step 2: /api/callback. Trades the code for a token and hands it to the CMS window.
const ORIGIN = process.env.SITE_ORIGIN || 'https://xfnl.studio';

function readCookie(header, name) {
  const parts = (header || '').split(';');
  for (let i = 0; i < parts.length; i += 1) {
    const kv = parts[i].trim().split('=');
    if (kv[0] === name) { return kv.slice(1).join('='); }
  }
  return '';
}

function reply(res, status, ok, payload) {
  const message = 'authorization:github:' + (ok ? 'success' : 'error') + ':' + JSON.stringify(payload);
  const body = '<!doctype html><html><body><p>Signing you in…</p><script>(function () {' +
    'var origin = ' + JSON.stringify(ORIGIN) + ';' +
    'var message = ' + JSON.stringify(message) + ';' +
    'function receive(e) { if (e.origin !== origin) { return; } window.opener.postMessage(message, e.origin); window.removeEventListener("message", receive); window.close(); }' +
    'window.addEventListener("message", receive, false);' +
    'window.opener.postMessage("authorizing:github", origin);' +
    '})();</script></body></html>';
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Set-Cookie', 'oauth_state=; HttpOnly; Secure; SameSite=Lax; Path=/api; Max-Age=0');
  res.status(status).send(body);
}

module.exports = async (req, res) => {
  const query = req.query || {};
  const code = query.code;
  const state = query.state;
  if (!code || !state || readCookie(req.headers.cookie, 'oauth_state') !== state) {
    reply(res, 400, false, { error: 'invalid_state' });
    return;
  }
  try {
    const r = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code: code,
        redirect_uri: ORIGIN + '/api/callback',
      }),
    });
    const data = await r.json();
    if (!data.access_token) {
      reply(res, 400, false, { error: data.error || 'no_token' });
      return;
    }
    reply(res, 200, true, { token: data.access_token, provider: 'github' });
  } catch (err) {
    reply(res, 500, false, { error: 'exchange_failed' });
  }
};
