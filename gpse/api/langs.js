const GITHUB_TOKEN = process.env.PAT_1;

const LANG_COLORS = {
  JavaScript: '#f4a261', TypeScript: '#2ec4b6', Python: '#3572A5',
  Java: '#b07219', 'C++': '#f34b7d', C: '#8b8b8b', 'C#': '#178600',
  Go: '#2ec4b6', Rust: '#f4a261', Ruby: '#701516', PHP: '#7a86b8',
  Swift: '#F05138', Kotlin: '#c77dff', HTML: '#e34c26', CSS: '#7a86b8',
  Shell: '#89e051', Dart: '#2ec4b6', Vue: '#41b883', Lua: '#f4a261',
  Haskell: '#c77dff', Elixir: '#c77dff', Zig: '#f4a261',
};

function langColor(lang) {
  return LANG_COLORS[lang] || '#555555';
}

async function fetchLangs(username) {
  const headers = { 'Accept': 'application/vnd.github.v3+json' };
  if (process.env.PAT_1) headers['Authorization'] = `token ${process.env.PAT_1}`;

  const res = await fetch(`https://api.github.com/users/${username}/repos?sort=pushed&per_page=50&type=owner`, { headers });
  if (!res.ok) throw new Error(`User not found: ${username}`);
  const repos = await res.json();

  const counts = {};
  repos.forEach(r => { if (r.language) counts[r.language] = (counts[r.language] || 0) + 1; });

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const total = sorted.reduce((s, [, v]) => s + v, 0);
  return sorted.map(([lang, count]) => ({ lang, count, pct: Math.round(count / total * 100) }));
}

export default async function handler(req, res) {
  const { username = 'WTRMLNv1' } = req.query;

  try {
    const langs = await fetchLangs(username);

    const padX = 20, padY = 52;
    const barH = 8, rowH = 26;
    const W = 320;
    const H = padY + barH + 12 + langs.length * rowH + 20;

    // build bar segments
    let barX = padX;
    const barW = W - padX * 2;
    const segments = langs.map(({ lang, pct }) => {
      const w = Math.round(barW * pct / 100);
      const seg = `<rect x="${barX}" y="${padY}" width="${w}" height="${barH}" fill="${langColor(lang)}" opacity="0.9"/>`;
      barX += w;
      return seg;
    });

    const rows = langs.map(({ lang, pct }, i) => {
      const y = padY + barH + 14 + i * rowH;
      const color = langColor(lang);
      return `
  <rect x="${padX}" y="${y + 2}" width="8" height="8" rx="2" fill="${color}"/>
  <text x="${padX + 14}" y="${y + 11}" font-family="'JetBrains Mono','Fira Mono',monospace" font-size="11" fill="#cccccc">${lang}</text>
  <text x="${W - padX}" y="${y + 11}" font-family="'JetBrains Mono','Fira Mono',monospace" font-size="11" fill="#666" text-anchor="end">${pct}%</text>`;
    });

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" rx="6" fill="#1a1a1a" stroke="#2e2e2e" stroke-width="1"/>

  <rect x="0" y="0" width="${W}" height="36" rx="6" fill="#212121"/>
  <rect x="0" y="30" width="${W}" height="6" fill="#212121"/>
  <rect x="${padX}" y="12" width="4" height="14" rx="1" fill="#f4a261"/>
  <text x="${padX + 12}" y="23" font-family="'JetBrains Mono','Fira Mono',monospace" font-size="12" font-weight="700" fill="#e0e0e0">${username}</text>
  <text x="${W - padX}" y="23" font-family="'JetBrains Mono','Fira Mono',monospace" font-size="10" fill="#555" text-anchor="end">top languages</text>

  <!-- bar track -->
  <rect x="${padX}" y="${padY}" width="${W - padX * 2}" height="${barH}" rx="2" fill="#2a2a2a"/>
  ${segments.join('')}

  ${rows.join('')}

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
}
