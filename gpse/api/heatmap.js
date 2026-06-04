function heatColor(v) {
  if (v === 0) return '#222222';
  if (v <= 2) return '#1a4a45';
  if (v <= 5) return '#1e7a6e';
  if (v <= 9) return '#2ec4b6';
  return '#7eeee8';
}

module.exports = async function handler(req, res) {
  const { username = 'WTRMLNv1', weeks = '18' } = req.query;
  const WEEKS = Math.min(Math.max(parseInt(weeks) || 18, 6), 52);

  try {
    const headers = { 'Accept': 'application/vnd.github.v3+json' };
    if (process.env.PAT_1) headers['Authorization'] = `token ${process.env.PAT_1}`;

    const r = await fetch(`https://api.github.com/users/${username}/events?per_page=100`, { headers });
    if (!r.ok) throw new Error(`User not found: ${username}`);
    const events = await r.json();

    const counts = {};
    events.forEach(e => {
      const d = e.created_at?.slice(0, 10);
      if (!d) return;
      let n = 0;
      if (e.type === 'PushEvent') n = e.payload?.commits?.length || 1;
      else if (e.type === 'PullRequestEvent') n = 3;
      else if (e.type === 'IssuesEvent') n = 1;
      else if (e.type === 'CreateEvent') n = 1;
      counts[d] = (counts[d] || 0) + n;
    });

    const CELL = 11, GAP = 3, STEP = 14;
    const padX = 20, padY = 52;
    const DAY_LABELS_W = 24;
    const DAYS = WEEKS * 7;
    const today = new Date();
    const gridW = WEEKS * STEP - GAP;
    const W = padX * 2 + DAY_LABELS_W + gridW;
    const gridH = 7 * STEP - GAP;
    const H = padY + gridH + 36;

    const cells = [];
    const monthsSeen = new Set();
    const monthLabels = [];

    for (let i = 0; i < DAYS; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - (DAYS - 1 - i));
      const key = d.toISOString().slice(0, 10);
      const col = Math.floor(i / 7);
      const row = i % 7;
      const x = padX + DAY_LABELS_W + col * STEP;
      const y = padY + row * STEP;
      const count = counts[key] || 0;
      cells.push(`<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2" fill="${heatColor(count)}"/>`);

      const m = d.toLocaleString('en', { month: 'short' });
      if (!monthsSeen.has(m) && col > 0) {
        monthsSeen.add(m);
        monthLabels.push(`<text x="${x}" y="${padY - 6}" font-family="'JetBrains Mono','Fira Mono',monospace" font-size="9" fill="#555">${m}</text>`);
      }
    }

    const dayLabels = ['Mo', 'We', 'Fr'].map((d, i) => {
      const row = [1, 3, 5][i];
      return `<text x="${padX + DAY_LABELS_W - 4}" y="${padY + row * STEP + 9}" font-family="'JetBrains Mono','Fira Mono',monospace" font-size="9" fill="#444" text-anchor="end">${d}</text>`;
    });

    const legendColors = ['#222222', '#1a4a45', '#1e7a6e', '#2ec4b6', '#7eeee8'];
    const legendX = W - padX - legendColors.length * 14;
    const legendY = H - 18;
    const legend = legendColors.map((c, i) =>
      `<rect x="${legendX + i * 14}" y="${legendY}" width="${CELL}" height="${CELL}" rx="2" fill="${c}"/>`
    );

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" rx="6" fill="#1a1a1a" stroke="#2e2e2e" stroke-width="1"/>
  <rect x="0" y="0" width="${W}" height="36" rx="6" fill="#212121"/>
  <rect x="0" y="30" width="${W}" height="6" fill="#212121"/>
  <rect x="${padX}" y="12" width="4" height="14" rx="1" fill="#2ec4b6"/>
  <text x="${padX + 12}" y="23" font-family="'JetBrains Mono','Fira Mono',monospace" font-size="12" font-weight="700" fill="#e0e0e0">${username}</text>
  <text x="${W - padX}" y="23" font-family="'JetBrains Mono','Fira Mono',monospace" font-size="10" fill="#555" text-anchor="end">contributions</text>
  ${monthLabels.join('\n  ')}
  ${dayLabels.join('\n  ')}
  ${cells.join('\n  ')}
  <text x="${padX}" y="${legendY + 9}" font-family="'JetBrains Mono','Fira Mono',monospace" font-size="9" fill="#444">less</text>
  ${legend.join('')}
  <text x="${legendX + legendColors.length * 14 + 4}" y="${legendY + 9}" font-family="'JetBrains Mono','Fira Mono',monospace" font-size="9" fill="#444">more</text>
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
