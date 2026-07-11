# Sports Cards Near Me

A location-based directory for sports card stores built with HTML, JS, Tailwind, and Google Maps.
## Map setup

The interactive map needs a Mapbox public token (free tier: 50k loads/month).
Create one at account.mapbox.com → Tokens (URL-restrict it to sportscardsnearme.ca
and localhost), then:

- Local: put `PUBLIC_MAPBOX_TOKEN=pk.…` in `.env`
- CI/Cloudflare: add `PUBLIC_MAPBOX_TOKEN` as a repo Actions secret and pass it as an
  env var on the build step in `.github/workflows/site.yml`

No token? The site works fully — the map simply stays off.
