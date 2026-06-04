# GPSE — GitHub Profile Stats Engine

Custom SVG stats cards for your GitHub README. Dark, monospaced, badge-style. Self-hosted on Vercel.

## Deploy in 3 steps

### 1. Fork & deploy
- Fork this repo
- Go to [vercel.com](https://vercel.com) → New Project → import your fork → Deploy

### 2. Add your GitHub token
- GitHub → Settings → Developer settings → Personal access tokens (classic)
- Generate token with scopes: `read:user`, `repo`
- Vercel → your project → Settings → Environment Variables
- Add: `PAT_1` = your token
- Redeploy

### 3. Paste into your README

Replace `your-app` with your actual Vercel URL:

```md
<!-- Stats card -->
![](https://your-app.vercel.app/api/stats?username=WTRMLNv1)

<!-- Top languages -->
![](https://your-app.vercel.app/api/langs?username=WTRMLNv1)

<!-- Contribution heatmap (default 18 weeks) -->
![](https://your-app.vercel.app/api/heatmap?username=WTRMLNv1)

<!-- Heatmap with custom width (6–52 weeks) -->
![](https://your-app.vercel.app/api/heatmap?username=WTRMLNv1&weeks=26)
```

## Endpoints

| Endpoint | Params | Description |
|---|---|---|
| `/api/stats` | `username` | Repos, followers, commits, PRs, issues |
| `/api/langs` | `username` | Top languages bar + breakdown |
| `/api/heatmap` | `username`, `weeks` (6–52) | Contribution heatmap, teal/amber theme |

## Notes
- Cards cache for 1 hour on Vercel's CDN (`s-maxage=3600`)
- Heatmap uses GitHub Events API — shows ~90 days of real activity
- No database, no dependencies, pure serverless functions
