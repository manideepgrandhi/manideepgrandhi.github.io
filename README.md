# Manideep Grandhi — Portfolio

Personal portfolio and resume, live at https://manideepgrandhi.github.io/

- `index.html` — the site
- `Manideep_Grandhi_Resume.pdf` / `.docx` — downloadable resume

## Tools

[/tools/](https://manideepgrandhi.github.io/tools/) is one self-contained page with tabs (deep links such as `/tools/#cron`). It works offline, makes no network requests, and does not store anything you type.

- **Password**: `crypto.getRandomValues` with rejection sampling. Length 8–128, character-set toggles, exclude look-alikes, a "safe for Postgres / shell" symbol set, at least one character from each selected set guaranteed, entropy shown, up to 50 at once.
- **Case**: UPPERCASE, lowercase, Title Case, Sentence case, tOGGLE case, with character and word counts.
- **Epoch / time**: epoch in s, ms, µs or ns to date and back. Shows UTC, IST, US Eastern, US Pacific and local time, plus ISO 8601.
- **JSON**: format (2 or 4 spaces, or tab), minify, sort keys. Errors show line and column; warns when integers are larger than 2^53.
- **SQL**: a lightweight original formatter. It changes only whitespace and keyword case; strings, quoted names, comments, dollar-quoted bodies and psql backslash commands are copied exactly.
- **Cron**: 5-field cron to plain English, next 5 runs in a chosen time zone (IST by default). Supports lists, ranges, steps, names and @macros, and explains the OR rule when both day-of-month and day-of-week are set.
- **Encode & hash**: Base64 (UTF-8, URL-safe), URL encode/decode, MD5 (own implementation) and SHA-1/256/384/512 (WebCrypto) for text or files, and UUID v4/v7 in bulk.
- **Diff**: line diff (LCS), side by side or unified, with ignore-whitespace and ignore-case options.
- **Units**: decimal and binary byte units, plus an IOPS × IO size = throughput calculator (formula only, approximate).
