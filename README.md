# Manideep Grandhi — Portfolio

Personal portfolio and resume, live at https://manideepgrandhi.github.io/

- `index.html` — the site
- `Manideep_Grandhi_Resume.pdf` / `.docx` — downloadable resume

## Tools

[/tools/](https://manideepgrandhi.github.io/tools/) is one self-contained page with tabs (deep links such as `/tools/#cron`). It works offline, makes no network requests, and does not store anything you type.

- **Time now** (`/tools/#now`, default tab): live clocks for UTC, IST, US Eastern, Mountain and Pacific, plus optional Arizona. Shows date, 12/24-hour time, abbreviation and UTC offset, whether DST is in effect, and the next DST change, found by scanning offsets. Daylight saving comes from the browser's IANA zone data. Has a copy-all button.
- **Convert** (`/tools/#convert`): converts a date and time from UTC, IST, US zones, Arizona, local or any IANA zone (searchable) to UTC, IST, ET, MT, PT and optionally Arizona. Shows abbreviation, offset, ±1-day markers, ISO 8601 and epoch.
  - Warns about spring-forward gaps and shows the shifted time; shows both options for fall-back repeats.
  - Swap and Now buttons, add/subtract days, hours or minutes, and the difference between two date-times, all DST-aware.
  - "Share link" puts the inputs in the URL hash only when clicked.
- **Password**: `crypto.getRandomValues` with rejection sampling. Length 8–128, character-set toggles, exclude look-alikes, a "safe for Postgres / shell" symbol set, at least one character from each selected set guaranteed, entropy shown, up to 50 at once.
- **Case**: UPPERCASE, lowercase, Title Case, Sentence case, tOGGLE case, with character and word counts.
- **Epoch / time**: epoch in s, ms, µs or ns to date and back. Shows UTC, IST, US Eastern, US Pacific and local time, plus ISO 8601.
- **JSON**: format (2 or 4 spaces, or tab), minify, sort keys. Errors show line and column; warns when integers are larger than 2^53.
- **SQL**: a lightweight original formatter. It changes only whitespace and keyword case; strings, quoted names, comments, dollar-quoted bodies and psql backslash commands are copied exactly.
- **Cron**: 5-field cron to plain English, next 5 runs in a chosen time zone (IST by default). Supports lists, ranges, steps, names and @macros, and explains the OR rule when both day-of-month and day-of-week are set.
- **Encode & hash**: Base64 (UTF-8, URL-safe), URL encode/decode, MD5 (own implementation) and SHA-1/256/384/512 (WebCrypto) for text or files, and UUID v4/v7 in bulk.
- **Diff**: line diff (LCS), side by side or unified, with ignore-whitespace and ignore-case options.
- **Units**: decimal and binary byte units, plus an IOPS × IO size = throughput calculator (formula only, approximate).

## Travel journal

[/travel/](https://manideepgrandhi.github.io/travel/) is a private travel journal that runs entirely in the browser, with no account and no server.

- **Storage:** trips, wishlist and photos are saved in IndexedDB. Photos are resized to at most 1600 px JPEG, plus a 480 px thumbnail. If IndexedDB is unavailable, trips and the wishlist fall back to localStorage, without photos.
- **Trips:** place, city, state, country, dates, type, companions, 1–5 rating, tags, notes, budget and spend (INR by default, any 3-letter currency), optional latitude/longitude (typed in or "use my location"), and multiple photos with a gallery and lightbox.
- **Views:**
  - **List:** search, filter by country, year, tag and rating, and sort.
  - **Timeline:** grouped by year.
  - **Stats:** countries, cities, trips, days travelled (overlapping trips counted once), spend per currency, top tags.
  - **Map:** an offline SVG world map using Natural Earth land outlines (public domain). An optional "online map" uses Leaflet and OpenStreetMap tiles; it is off by default, not remembered, and loaded with SRI.
  - **Wishlist:** with "Plan trip", which marks the place visited once the trip is saved.
  - **Print:** a print-friendly trip page.
- **Backup:** JSON export with photos embedded as base64, or without photos. Import can merge (newer edits win) or replace. A banner reminds you that the data lives only in this browser and to export regularly.
- No network requests are made unless you turn on the online map, or use "use my location" (the browser may consult its location service).

## Sticky Pad

[/sticky/](https://manideepgrandhi.github.io/sticky/) is a sticky-notes page that runs entirely in the browser.

- **Notes:** multi-line. In the composer, Enter adds a new line and Ctrl/⌘+Enter or **Save note** saves. `/` jumps to the composer.
- **Each note:** pin to top, 7 colours, copy, edit inline (double-click or ✏️; Ctrl/⌘+Enter saves, Esc cancels), delete with Undo. Long notes collapse after 12 lines with "Show more".
- **Search** highlights matches. **Export** downloads `sticky-pad-YYYY-MM-DD.json`; **Import** merges by note id (newer edits win). **Clear all** asks first and can be undone.
- **Storage:** `localStorage["mg-sticky-v1"]` holds `{v:2, notes, tombs}`. Each note has a `mod` time, and deleted notes leave a tombstone `{id: deletedAt}` so deletes can sync. Older v1 data is upgraded automatically. Other open tabs stay in sync.
- **Offline:** `sticky/sw.js` (network first, cache fallback) plus `manifest.webmanifest`, so it opens offline after one visit and can be installed as an app. It only caches `/sticky/` files, never Google requests.

### Google Drive sync

Optional sync across devices with no server. The page signs in with Google Identity Services, asks only for the `drive.appdata` scope, and keeps all notes in one file, `sticky-pad.json`, in the hidden app-data folder of your own Drive. That folder is private to this app and the app can't see your other Drive files. The access token stays in memory. Only a "connected" flag and your email are saved in localStorage.

- **When it syncs:** on page load (silently), about 3 seconds after a change, when you come back to the tab, when the device goes back online, and when you press **Sync now**.
- **Merge:** each sync pulls, merges, then pushes. For each note the newest change wins, including pins and colours. Deletes win over older edits. Tombstones are purged after 30 days. If the file changes during a sync, the page pulls and merges again before writing.
- **Disconnect** revokes the token and keeps the notes on this device.
- **Limits:** a Google token lasts about an hour. After that, browsers may block the silent sign-in pop-up, so you may need to tap **Sync now** once. A device that stays offline for more than 30 days can bring back notes that were deleted elsewhere.

**Setup (one time).** Until this is done the page shows "Sync not set up yet".

1. Open [Google Cloud Console](https://console.cloud.google.com/) and create a project, for example `sticky-pad`.
2. Go to **APIs & Services → Library**, search for **Google Drive API**, and click **Enable**.
3. Go to **APIs & Services → OAuth consent screen** (Google Auth Platform). Choose **External**, set the app name and your email, and add the scope `.../auth/drive.appdata`. This scope is non-sensitive, so no Google review is needed. Then either add your Google account under **Test users**, or **Publish** the app. In Testing mode, sign-ins expire after 7 days.
4. Go to **APIs & Services → Credentials → Create credentials → OAuth client ID**. Choose **Web application** and add `https://manideepgrandhi.github.io` under **Authorized JavaScript origins**. For local testing, also add `http://localhost:8765`. You don't need a redirect URI.
5. Copy the Client ID (`…apps.googleusercontent.com`) into `sticky/config.js` as `GOOGLE_CLIENT_ID: '…'`, then commit and push. A client ID is public, not a secret.
6. On each device, open /sticky/, click **Connect Google Drive**, and sign in with the same Google account.

## Shared look: header bar, footer, dark mode

One source of truth for the look shared by every site (home, projects, tools, travel, sticky, blog, pg-commands, db-cheatsheet, paisa-diary):

- `assets/mg-shared.css` holds the design tokens (`--mg-*`), the slim site bar, the footer, and the dark palette for the personal pages (`body.mg-fam`).
- `assets/mg-shared.js` builds the bar (brand, site title, nav that collapses to ☰ on mobile, theme toggle) and the footer. It reads its config from `<html data-mg-site data-mg-here data-mg-local>` and exposes `window.MG` plus a `mg-theme` event.
- `assets/mg-theme-head.js` is the pre-paint script, inlined in `<head>`. It sets `data-theme` (light/dark) and `data-theme-pref` (light/dark/auto) from `localStorage["mg-theme"]`, falling back to the system setting. It migrates the blog's old `localStorage.theme` once.

The theme is stored under one key, `mg-theme` (`light` | `dark` | `auto`), so the choice carries across all sites on this origin.

Pages hold marker blocks that are regenerated, so never edit inside them:

```
<!--mg:head link|inline--> … <!--/mg:head-->
<!--mg:body link|inline--> … <!--/mg:body-->
```

`link` pages (home, projects, tools, blog) load `/assets/…`. `inline` pages (travel, sticky, pg-commands, db-cheatsheet, paisa-diary) carry a vendored copy so they keep working offline.

After editing anything in `assets/mg-*`:

```
python3 scripts/sync-mg-shared.py          # this repo + ../pg-commands, ../db-cheatsheet/src/head.html, ../paisa-diary
(cd ../db-cheatsheet && ./build.sh)
```
