// GitHub OAuth, step 1. Sveltia CMS opens this in a popup: /api/auth
// Needs two Vercel environment variables: GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET.
const crypto = require('crypto');

const ORIGIN = process.env.SITE_ORIGIN || 'https://xfnl.studio';

module.exports = (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    res.status(500).send('GITHUB_CLIENT_ID is not set in Vercel.');
    return;
  }
  const state = crypto.randomBytes(16).toString('hex');
  res.setHeader('Set-Cookie', 'oauth_state=' + state + '; HttpOnly; Secure; SameSite=Lax; Path=/api; Max-Age=600');
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: ORIGIN + '/api/callback',
    scope: 'repo,user',
    state: state,
  });
  res.writeHead(302, { Location: 'https://github.com/login/oauth/authorize?' + params.toString() });
  res.end();
};
