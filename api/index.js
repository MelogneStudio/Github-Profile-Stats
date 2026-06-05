const https = require("https");

function ghFetch(path, token) {
  return new Promise((resolve, reject) => {
    const headers = { "User-Agent": "github-stats-card" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    https.get(
      { hostname: "api.github.com", path, headers },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          try { resolve(JSON.parse(data)); }
          catch (e) { reject(e); }
        });
      }
    ).on("error", reject);
  });
}

function fmt(n) {
  if (!n) return "0";
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n);
}

function escape(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const LANG_COLORS = {
  JavaScript: "#f1e05a", TypeScript: "#3178c6", Python: "#3572A5",
  Rust: "#dea584", Go: "#00ADD8", Ruby: "#701516", Java: "#b07219",
  "C++": "#f34b7d", C: "#555555", CSS: "#563d7c", HTML: "#e34c26",
  Shell: "#89e051", Swift: "#ffac45", Kotlin: "#A97BFF", Vue: "#41b883",
  Dart: "#00B4AB", PHP: "#4F5D95", Lua: "#000080", Zig: "#ec915c",
  Elixir: "#6e4a7e", Nix: "#7e7eff", Haskell: "#5e5086", R: "#198CE7",
};

function buildSVG({ user, repos, events, totalCommits }) {
  const thisYear = new Date().getFullYear();

  // Stats
  const stars = repos.reduce((s, r) => s + (r.stargazers_count || 0), 0);
  const commitsThisYear = events
    .filter(e => e.type === "PushEvent" && new Date(e.created_at).getFullYear() === thisYear)
    .reduce((s, e) => s + (e.payload?.commits?.length || 0), 0);
  const prs = events.filter(e => e.type === "PullRequestEvent").length;

  // Top repos (non-fork, by stars)
  const topRepos = repos
    .filter(r => !r.fork)
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, 5)
    .map(r => r.name);

  // Top languages
  const langMap = {};
  repos.forEach(r => { if (r.language) langMap[r.language] = (langMap[r.language] || 0) + 1; });
  const topLangs = Object.entries(langMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const W = 480;
  const avatarSize = 52;
  const name = escape(user.name || user.login);
  const handle = escape("@" + user.login);
  const bio = escape((user.bio || "").substring(0, 72) + ((user.bio || "").length > 72 ? "…" : ""));

  // Repo tags — measure roughly 7px per char + 20px padding
  let repoTagsLine = "";
  let rx = 20;
  const ry = 268;
  for (const repo of topRepos) {
    const tw = repo.length * 7 + 22;
    if (rx + tw > W - 20) break;
    repoTagsLine += `<rect x="${rx}" y="${ry}" width="${tw}" height="20" rx="5" fill="#1e2329" stroke="#2e3640" stroke-width="0.75"/>`;
    repoTagsLine += `<text x="${rx + tw / 2}" y="${ry + 13.5}" text-anchor="middle" font-family="'JetBrains Mono',monospace" font-size="10.5" fill="#5a6472">${escape(repo)}</text>`;
    rx += tw + 7;
  }

  // Lang pills
  let langPills = "";
  let lx = 20;
  const ly = 318;
  for (const [lang] of topLangs) {
    const color = LANG_COLORS[lang] || "#5a6472";
    const tw = lang.length * 7 + 26;
    if (lx + tw > W - 20) break;
    langPills += `<circle cx="${lx + 6}" cy="${ly + 7}" r="4.5" fill="${color}"/>`;
    langPills += `<text x="${lx + 16}" y="${ly + 11.5}" font-family="'JetBrains Mono',monospace" font-size="10.5" fill="#5a6472">${escape(lang)}</text>`;
    lx += tw + 6;
  }

  const H = 360;

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <clipPath id="av"><circle cx="${20 + avatarSize / 2}" cy="${20 + avatarSize / 2}" r="${avatarSize / 2}"/></clipPath>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&amp;display=swap');
    </style>
  </defs>

  <!-- Background -->
  <rect width="${W}" height="${H}" rx="14" fill="#161b22" stroke="#2e3238" stroke-width="1"/>

  <!-- Avatar -->
  <image href="${escape(user.avatar_url)}&amp;s=100" x="20" y="20" width="${avatarSize}" height="${avatarSize}" clip-path="url(#av)"/>
  <circle cx="${20 + avatarSize / 2}" cy="${20 + avatarSize / 2}" r="${avatarSize / 2}" fill="none" stroke="#2e3238" stroke-width="1.5"/>

  <!-- Name / handle / bio -->
  <text x="86" y="42" font-family="'JetBrains Mono',monospace" font-weight="600" font-size="15" fill="#e6edf3">${name}</text>
  <text x="86" y="58" font-family="'JetBrains Mono',monospace" font-size="11" fill="#3d454f">${handle}</text>
  <text x="86" y="76" font-family="'JetBrains Mono',monospace" font-size="10.5" fill="#3d454f">${bio}</text>

  <!-- Divider 1 -->
  <line x1="20" y1="94" x2="${W - 20}" y2="94" stroke="#1e2329" stroke-width="1"/>

  <!-- Stats grid: 3 cols x 2 rows -->
  ${[
    { label: "stars",          val: fmt(stars) },
    { label: `commits ${thisYear}`, val: fmt(commitsThisYear) },
    { label: "PRs (recent)",   val: fmt(prs) },
    { label: "public repos",   val: fmt(user.public_repos) },
    { label: "followers",      val: fmt(user.followers) },
    { label: "following",      val: fmt(user.following) },
  ].map((s, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const cw = (W - 40 - 16) / 3;
    const sx = 20 + col * (cw + 8);
    const sy = 106 + row * (62 + 8);
    return `<rect x="${sx}" y="${sy}" width="${cw}" height="62" rx="8" fill="#0d1117" stroke="#1e2329" stroke-width="0.75"/>
<text x="${sx + cw / 2}" y="${sy + 28}" text-anchor="middle" font-family="'JetBrains Mono',monospace" font-weight="600" font-size="17" fill="#e6edf3">${escape(s.val)}</text>
<text x="${sx + cw / 2}" y="${sy + 46}" text-anchor="middle" font-family="'JetBrains Mono',monospace" font-size="9.5" fill="#3d454f" letter-spacing="0.06em">${escape(s.label.toUpperCase())}</text>`;
  }).join("\n  ")}

  <!-- Divider 2 -->
  <line x1="20" y1="254" x2="${W - 20}" y2="254" stroke="#1e2329" stroke-width="1"/>

  <!-- Section: repos -->
  <text x="20" y="268" font-family="'JetBrains Mono',monospace" font-size="9" fill="#2e3640" letter-spacing="0.08em">TOP REPOS</text>
  ${repoTagsLine}

  <!-- Divider 3 -->
  <line x1="20" y1="304" x2="${W - 20}" y2="304" stroke="#1e2329" stroke-width="1"/>

  <!-- Section: langs -->
  <text x="20" y="318" font-family="'JetBrains Mono',monospace" font-size="9" fill="#2e3640" letter-spacing="0.08em">LANGUAGES</text>
  ${langPills}

  <!-- Footer -->
  <text x="${W / 2}" y="${H - 12}" text-anchor="middle" font-family="'JetBrains Mono',monospace" font-size="9" fill="#1e2732">github-stats-card · vercel</text>
</svg>`;
}

module.exports = async function handler(req, res) {
  const username = req.query.username || req.query.user;
  if (!username) {
    res.status(400).setHeader("Content-Type", "text/plain");
    res.end("?username= is required");
    return;
  }

  const token = process.env.GITHUB_TOKEN;

  try {
    const [user, repos, events] = await Promise.all([
      ghFetch(`/users/${username}`, token),
      ghFetch(`/users/${username}/repos?per_page=100&sort=updated`, token),
      ghFetch(`/users/${username}/events?per_page=100`, token),
    ]);

    if (user.message === "Not Found") {
      res.status(404).setHeader("Content-Type", "text/plain");
      res.end("User not found");
      return;
    }

    const svg = buildSVG({ user, repos: Array.isArray(repos) ? repos : [], events: Array.isArray(events) ? events : [] });

    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
    res.status(200).end(svg);
  } catch (err) {
    res.status(500).setHeader("Content-Type", "text/plain");
    res.end("Error fetching GitHub data: " + err.message);
  }
};
