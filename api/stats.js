const LANG_COLORS = {};

async function fetchUser(username) {
  const headers = { 'Accept': 'application/vnd.github.v3+json' };
  if (process.env.PAT_1) headers['Authorization'] = `token ${process.env.PAT_1}`;

  const [userRes, eventsRes] = await Promise.all([
    fetch(`https://api.github.com/users/${username}`, { headers }),
    fetch(`https://api.github.com/users/${username}/events?per_page=100`, { headers }),
  ]);

  if (!userRes.ok) throw new Error(`User not found: ${username}`);
  const user = await userRes.json();
  const events = eventsRes.ok ? await eventsRes.json() : [];

  const commits = events.filter(e => e.type === 'PushEvent').reduce((s, e) => s + (e.payload?.commits?.length || 0), 0);
  const prs = events.filter(e => e.type === 'PullRequestEvent').length;
  const issues = events.filter(e => e.type === 'IssuesEvent').length;

  return { user, commits, prs, issues };
}

function fmt(n) {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
}

module.exports = async function handler(req, res) {
  const { username = 'WTRMLNv1' } = req.query;

  try {
    const { user, commits, prs, issues } = await fetchUser(username);

    const rows = [
      ['repos',         fmt(user.public_repos || 0), 0],
      ['followers',     fmt(user.followers || 0),     1],
      ['following',     fmt(user.following || 0),     2],
      ['commits (90d)', fmt(commits),                 3],
      ['pull requests', fmt(prs),                     4],
      ['issues',        fmt(issues),                  5],
    ];

    const padX = 20, padY = 52, rowH = 28;
    const W = 320, H = padY + rows.length * rowH + 20;

    const rowsSVG = rows.map(([label, value, i]) => {
      const accent = i % 2 === 0 ? '#2ec4b6' : '#f4a261';
      return `
  <rect x="${padX}" y="${padY + i * rowH + 2}" width="6" height="14" rx="1" fill="${accent}"/>
  <text x="${padX + 14}" y="${padY + i * rowH + 13}" font-family="'JetBrains Mono','Fira Mono',monospace" font-size="11" fill="#8b8b8b">${label}</text>
  <text x="${W - padX}" y="${padY + i * rowH + 13}" font-family="'JetBrains Mono','Fira Mono',monospace" font-size="11" fill="#e0e0e0" text-anchor="end">${value}</text>`;
    }).join('');

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" rx="6" fill="#1a1a1a" stroke="#2e2e2e" stroke-width="1"/>
  <rect x="0" y="0" width="${W}" height="36" rx="6" fill="#212121"/>
  <rect x="0" y="30" width="${W}" height="6" fill="#212121"/>
  <rect x="${padX}" y="12" width="4" height="14" rx="1" fill="#2ec4b6"/>
  <text x="${padX + 12}" y="23" font-family="'JetBrains Mono','Fira Mono',monospace" font-size="12" font-weight="700" fill="#e0e0e0">${username}</text>
  <text x="${W - padX}" y="23" font-family="'JetBrains Mono','Fira Mono',monospace" font-size="10" fill="#555" text-anchor="end">github stats</text>
  ${rowsSVG}
  <rect x="${padX}" y="${H - 12}" width="${W - padX * 2}" height="1" fill="#2a2a2a"/>
  <text x="${W / 2}" y="${H - 4}" font-family="'JetBrains Mono','Fira Mono',monospace" font-size="9" fill="#3a3a3a" text-anchor="middle">github.com/${username}</text>
</svg>`;

    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200');
    res.status(200).send(svg);
  } catch (e) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="60"><rect width="320" height="60" rx="6" fill="#1a1a1a" stroke="#2e2e2e" stroke-width="1"/><text x="16" y="35" font-family="monospace" font-size="12" fill="#f4a261">error: ${e.message}</text></svg>`;
    res.setHeader('Content-Type', 'image/svg+xml');
    res.status(200).send(svg);
  }
};
