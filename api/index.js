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

// Fetch commits via GraphQL contributionsCollection (accurate full-year count)
function ghGraphQL(query, token) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query });
    const headers = {
      "User-Agent": "github-stats-card",
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body),
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const req = https.request(
      { hostname: "api.github.com", path: "/graphql", method: "POST", headers },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          try { resolve(JSON.parse(data)); }
          catch (e) { reject(e); }
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// Fetch avatar image and return as base64 data URI
function fetchImageBase64(url) {
  return new Promise((resolve) => {
    const proto = url.startsWith("https") ? https : require("http");
    proto.get(url, (res) => {
      // Follow redirect
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchImageBase64(res.headers.location).then(resolve).catch(() => resolve(null));
      }
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        const buf = Buffer.concat(chunks);
        const mime = res.headers["content-type"] || "image/png";
        resolve(`data:${mime};base64,${buf.toString("base64")}`);
      });
    }).on("error", () => resolve(null));
  });
}

function fmt(n) {
  if (!n) return "0";
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n);
}

function esc(s) {
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

function buildSVG({ user, repos, commitsThisYear, prs, avatarDataUri }) {
  const thisYear = new Date().getFullYear();
  const stars = repos.reduce((s, r) => s + (r.stargazers_count || 0), 0);

  const topRepos = repos
    .filter(r => !r.fork)
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, 6)
    .map(r => r.name);

  const langMap = {};
  repos.forEach(r => { if (r.language) langMap[r.language] = (langMap[r.language] || 0) + 1; });
  const topLangs = Object.entries(langMap).sort((a, b) => b[1] - a[1]).slice(0, 6);

  const W = 480;
  const AV = 52;
  const name = esc(user.name || user.login);
  const handle = esc("@" + user.login);
  const bioRaw = (user.bio || "").substring(0, 72) + ((user.bio || "").length > 72 ? "…" : "");
  const bio = esc(bioRaw);

  // Repo tags
  let repoTagsLine = "";
  let rx = 20;
  const ry = 272;
  for (const repo of topRepos) {
    const tw = repo.length * 7 + 22;
    if (rx + tw > W - 20) break;
    repoTagsLine += `<rect x="${rx}" y="${ry}" width="${tw}" height="20" rx="5" fill="#1a1f27" stroke="#252d38" stroke-width="0.75"/>`;
    repoTagsLine += `<text x="${rx + tw / 2}" y="${ry + 13.5}" text-anchor="middle" font-family="'JetBrains Mono',monospace" font-size="10.5" fill="#4e5a68">${esc(repo)}</text>`;
    rx += tw + 7;
  }

  // Lang pills
  let langPills = "";
  let lx = 20;
  const ly = 322;
  for (const [lang] of topLangs) {
    const color = LANG_COLORS[lang] || "#4e5a68";
    const tw = lang.length * 7 + 26;
    if (lx + tw > W - 20) break;
    langPills += `<circle cx="${lx + 6}" cy="${ly + 7}" r="4.5" fill="${color}"/>`;
    langPills += `<text x="${lx + 16}" y="${ly + 11.5}" font-family="'JetBrains Mono',monospace" font-size="10.5" fill="#4e5a68">${esc(lang)}</text>`;
    lx += tw + 6;
  }

  const H = 366;
  const avatarTag = avatarDataUri
    ? `<image href="${avatarDataUri}" x="20" y="20" width="${AV}" height="${AV}" clip-path="url(#av)"/>`
    : `<circle cx="${20 + AV / 2}" cy="${20 + AV / 2}" r="${AV / 2}" fill="#1a1f27" stroke="#252d38" stroke-width="1.5"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <clipPath id="av"><circle cx="${20 + AV / 2}" cy="${20 + AV / 2}" r="${AV / 2}"/></clipPath>
  </defs>
  <rect width="${W}" height="${H}" rx="14" fill="#161b22" stroke="#252d38" stroke-width="1"/>
  ${avatarTag}
  <circle cx="${20 + AV / 2}" cy="${20 + AV / 2}" r="${AV / 2}" fill="none" stroke="#252d38" stroke-width="1.5"/>
  <text x="86" y="42" font-family="'JetBrains Mono',monospace" font-weight="600" font-size="15" fill="#e6edf3">${name}</text>
  <text x="86" y="58" font-family="'JetBrains Mono',monospace" font-size="11" fill="#3a4250">${handle}</text>
  <text x="86" y="76" font-family="'JetBrains Mono',monospace" font-size="10.5" fill="#3a4250">${bio}</text>
  <line x1="20" y1="96" x2="${W - 20}" y2="96" stroke="#1e2530" stroke-width="1"/>
  ${[
    { label: "stars",              val: fmt(stars) },
    { label: `commits ${thisYear}`, val: fmt(commitsThisYear) },
    { label: "prs (recent)",       val: fmt(prs) },
    { label: "public repos",       val: fmt(user.public_repos) },
    { label: "followers",          val: fmt(user.followers) },
    { label: "following",          val: fmt(user.following) },
  ].map((s, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const cw = (W - 40 - 16) / 3;
    const sx = 20 + col * (cw + 8);
    const sy = 108 + row * (64 + 8);
    return `<rect x="${sx}" y="${sy}" width="${cw}" height="64" rx="9" fill="#0d1117" stroke="#1a1f27" stroke-width="0.75"/>
<text x="${sx + cw / 2}" y="${sy + 30}" text-anchor="middle" font-family="'JetBrains Mono',monospace" font-weight="600" font-size="18" fill="#dde5ef">${esc(s.val)}</text>
<text x="${sx + cw / 2}" y="${sy + 48}" text-anchor="middle" font-family="'JetBrains Mono',monospace" font-size="9" fill="#343d4a" letter-spacing="0.07em">${esc(s.label.toUpperCase())}</text>`;
  }).join("\n  ")}
  <line x1="20" y1="258" x2="${W - 20}" y2="258" stroke="#1e2530" stroke-width="1"/>
  <text x="20" y="271" font-family="'JetBrains Mono',monospace" font-size="8.5" fill="#252d38" letter-spacing="0.1em">TOP REPOS</text>
  ${repoTagsLine}
  <line x1="20" y1="308" x2="${W - 20}" y2="308" stroke="#1e2530" stroke-width="1"/>
  <text x="20" y="321" font-family="'JetBrains Mono',monospace" font-size="8.5" fill="#252d38" letter-spacing="0.1em">LANGUAGES</text>
  ${langPills}
  <text x="${W / 2}" y="${H - 10}" text-anchor="middle" font-family="'JetBrains Mono',monospace" font-size="8.5" fill="#1a1f27">github-stats-card · vercel</text>
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
    // Fetch user, repos, events in parallel
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

    // Accurate commits via GraphQL if token available, else fall back to events
    let commitsThisYear = 0;
    const thisYear = new Date().getFullYear();

    if (token) {
      try {
        const from = `${thisYear}-01-01T00:00:00Z`;
        const to   = `${thisYear}-12-31T23:59:59Z`;
        const gql = await ghGraphQL(`{
          user(login: "${username}") {
            contributionsCollection(from: "${from}", to: "${to}") {
              totalCommitContributions
              restrictedContributionsCount
            }
          }
        }`, token);
        const col = gql?.data?.user?.contributionsCollection;
        if (col) {
          commitsThisYear = (col.totalCommitContributions || 0) + (col.restrictedContributionsCount || 0);
        }
      } catch (_) {
        // GraphQL failed, fall through to events estimate
      }
    }

    // Events fallback (last ~90 days only)
    if (commitsThisYear === 0 && Array.isArray(events)) {
      commitsThisYear = events
        .filter(e => e.type === "PushEvent" && new Date(e.created_at).getFullYear() === thisYear)
        .reduce((s, e) => s + (e.payload?.commits?.length || 0), 0);
    }

    const prs = Array.isArray(events)
      ? events.filter(e => e.type === "PullRequestEvent").length
      : 0;

    // Fetch avatar and embed as base64 so it renders in GitHub READMEs
    const avatarDataUri = await fetchImageBase64(`${user.avatar_url}&s=100`);

    const svg = buildSVG({
      user,
      repos: Array.isArray(repos) ? repos : [],
      commitsThisYear,
      prs,
      avatarDataUri,
    });

    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
    res.status(200).end(svg);
  } catch (err) {
    res.status(500).setHeader("Content-Type", "text/plain");
    res.end("Error: " + err.message);
  }
};