# OpShop Finder

The definitive op shop directory for the Gold Coast — find shops near you, see what's open right now, filter by charity, get directions in one tap.

A mobile-first PWA built with vanilla JavaScript and Leaflet. No build step. No backend (yet). Deploys as a static site to Railway.

## Status

**Active — Gold Coast MVP.** First public-beta target: late April 2026.

See [PRODUCT-BRIEF.md](PRODUCT-BRIEF.md) for vision, personas, user stories, scope, and the post-MVP roadmap. See [ARCHITECTURE.md](ARCHITECTURE.md) for the technical design.

## Features (MVP)

- Interactive map of all op shops on the Gold Coast (~40 shops, growing)
- Marker clustering — sane density at every zoom level
- Charity-coloured pins (Vinnies blue, Salvos red, Lifeline green, Other grey)
- Filter chips: Open now · Vinnies · Salvos · Lifeline · Other
- Search by suburb, postcode, or shop name with autocomplete
- "Near me" geolocation with distance-to-nearest
- Shop detail panel with hours, phone, website, "Open / Closed" badge, distance
- Get directions — one tap to Apple Maps (iOS/macOS) or Google Maps
- Native share sheet (`navigator.share`)
- Save favourites locally + filter to "★ Favourites only"
- "Report a fix" mailto: link on every shop
- Last-verified date stamp per shop
- Dark mode (follows system `prefers-color-scheme`)
- Schema.org `ThriftStore` JSON-LD for SEO
- Static per-suburb landing pages at `/suburb/<slug>/` for SEO
- Installable PWA — works offline after first load
- Service worker update banner — users always get the latest version

## Tech Stack

- **HTML/CSS/JS** — vanilla, no framework, no build
- **Leaflet 1.9** + **Leaflet.markercluster 1.5** via unpkg CDN
- **OpenStreetMap** tiles (with Retina detection)
- **Service worker** for offline shell + tile/data caching
- **Static hosting** on Railway via `npx serve`

## Local development

```sh
npx serve -s . -l 4321
open http://localhost:4321/
```

That's it for the SPA — no build step.

### Regenerating suburb landing pages

After editing `data/gold-coast-opshops.json`, rebuild the static suburb pages:

```sh
npm run build         # runs python3 tools/build-suburbs.py
```

This regenerates everything under `suburb/` and the `sitemap.xml`. Commit the changes alongside the data update.

To clear the service worker during dev: open Safari → Develop → Service Workers → Unregister.

## Deployment

Push to GitHub, link the repo to a Railway project. Railway auto-detects [`railway.json`](railway.json) and runs `npx serve` against the static files. No environment variables required.

**Cache busting:** when shipping JS/CSS changes, bump `VERSION` in [`sw.js`](sw.js). Users will see the "New version available" banner on their next visit.

## File layout

```
.
├── index.html              # Single-page entry
├── manifest.json           # PWA manifest
├── sw.js                   # Service worker (shell + tile + data caching)
├── favicon.ico
├── robots.txt
├── sitemap.xml
├── package.json            # serve dependency
├── railway.json            # Railway deploy config
├── serve.json              # serve headers config
├── css/style.css
├── js/
│   ├── hours.js            # "Mon-Fri 9am-5pm" parser + isOpenNow()
│   ├── favourites.js       # localStorage-backed shop favouriting
│   ├── map.js              # Leaflet init, Retina tiles
│   ├── markers.js          # Loads JSON, builds clustered markers
│   ├── filters.js          # Central filter state (query / open-now / charities / categories / favourites)
│   ├── search.js           # Search input → filters; populates suburb autocomplete
│   ├── chips.js            # Filter chip UI controller (incl. dynamic category chips)
│   ├── geolocation.js      # Browser geolocation + Haversine
│   └── detail-panel.js     # Slide-up shop detail with share/directions/report/favourite
├── icons/                  # SVG + 192/512 PNG app icons
├── tools/
│   └── build-suburbs.py    # Generates suburb landing pages + sitemap from data
├── suburb/                 # Generated static suburb landing pages (committed)
└── data/
    └── gold-coast-opshops.json    # Hand-curated shop list
```

## Data

Shop data lives in [`data/gold-coast-opshops.json`](data/gold-coast-opshops.json). Schema:

```json
{
  "name": "St Vincent de Paul Society - Labrador",
  "address": "18A Imperial Parade",
  "suburb": "Labrador",
  "postcode": "4215",
  "lat": -27.9467,
  "lng": 153.4012,
  "phone": "07 5537 8944",
  "website": "https://www.vinnies.org.au",
  "hours": "Mon-Fri 9am-5pm, Sat 9am-2pm",
  "charity": "Vinnies",
  "lastVerified": "2026-04-17"
}
```

`hours` strings must match the parser format in [`js/hours.js`](js/hours.js): `<DayRange> <start>-<end>` segments separated by commas, where:
- DayRange: `Mon-Fri`, `Mon-Sat`, `Sat`, `Sun`, etc.
- Times: `9am`, `4:30pm`, `12pm` (case-insensitive)

Update `lastVerified` on each shop when hours/address are checked.

## Roadmap

See PRODUCT-BRIEF.md §5 for the full multi-phase plan. Headline next steps after the Gold Coast MVP launches:

1. User submission form (with moderation queue)
2. Per-suburb SEO landing pages
3. Brisbane / SEQ expansion
4. Charity admin panel (self-managed listings)
5. NSW expansion
6. National coverage + monetisation

## Optional integrations (config-gated)

All of these are inert by default. Uncomment the relevant `<meta>` tag in
`index.html` and paste your key/DSN to activate.

### Google Street View hero photos
1. Sign up at [Google Cloud Console](https://console.cloud.google.com)
2. Create a project, enable **"Street View Static API"**
3. Create an API key (Credentials → Create credentials → API key)
4. Restrict the key:
   - **Application restrictions:** HTTP referrers → add `*.opshopsearch.com/*` and `localhost:*/*`
   - **API restrictions:** restrict to **Street View Static API** only
5. Uncomment in `index.html` head:
   `<meta name="streetview-key" content="YOUR_KEY">`
6. Free quota: **10,000 panorama loads / month**. We hit the metadata endpoint first to avoid burning quota when no photo exists.

### Plausible analytics
Sign up at [plausible.io](https://plausible.io), then uncomment:
`<meta name="plausible-domain" content="beta.opshopsearch.com">`

### Sentry error tracking
Create a Sentry project, then uncomment:
`<meta name="sentry-dsn" content="https://YOUR_KEY@sentry.io/YOUR_PROJECT">`

### Newsletter (Buttondown / Formspree)
Edit `js/newsletter.js`, set `NEWSLETTER_ENDPOINT` to your form URL.

### Submit-a-shop form (Formspree)
Edit `submit/index.html`, replace `REPLACE_ME` in the form `action` with your Formspree form ID.

## Project owner

Southern Claw Labs. Issues / corrections: hello@opshopsearch.com

<!-- rename-verify: opshopsearch 2026-04-18T01:56:13Z -->
