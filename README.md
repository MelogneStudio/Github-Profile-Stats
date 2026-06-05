# github-stats-card

A self-hosted SVG stats card API for your GitHub README. Deploy to Vercel in one click.

## Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/github-stats-card)

**Steps:**
1. Fork / clone this repo
2. Push to GitHub
3. Import into [Vercel](https://vercel.com) — zero config needed
4. (Optional) Add a `GITHUB_TOKEN` env var in Vercel settings to avoid rate limits

## Usage

Once deployed, add this to your README:

```md
![GitHub Stats](https://YOUR_VERCEL_URL/api/stats?username=YOUR_USERNAME)
```

Or as an HTML image (better for alignment):

```html
<img src="https://YOUR_VERCEL_URL/api/stats?username=YOUR_USERNAME" alt="GitHub Stats" />
```

### Parameters

| Param      | Description              | Example         |
|------------|--------------------------|-----------------|
| `username` | GitHub username (required) | `?username=torvalds` |

## Rate Limits

GitHub's unauthenticated API allows 60 requests/hour per IP. To increase this:

1. Create a GitHub personal access token (classic, read-only `public_repo` scope)
2. In Vercel project settings → Environment Variables, add:
   - Key: `GITHUB_TOKEN`
   - Value: `ghp_xxxxxxxx...`

Responses are cached for 1 hour via `Cache-Control`.

## What's shown

- Profile picture, name, @username, bio
- Stars (sum across all public repos)
- Commits this year (from public events feed)
- PRs opened (from public events feed)
- Public repo count, followers, following
- Top repos by stars
- Top languages by repo count

## Local dev

```bash
npm i -g vercel
vercel dev
# visit http://localhost:3000/api/stats?username=torvalds
```
