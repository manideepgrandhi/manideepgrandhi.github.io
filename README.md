# Manideep Grandhi — Portfolio

Personal portfolio and resume, live at https://manideepgrandhi.github.io/

- `index.html` — the site
- `Manideep_Grandhi_Resume.pdf` / `.docx` — downloadable resume

## Tools

[/tools/](https://manideepgrandhi.github.io/tools/) is a single self-contained page that works offline:

- **Random password generator**: uses `crypto.getRandomValues` with rejection sampling (no `Math.random`). Length 8–128, character-set toggles, an option to exclude look-alike characters, and a "safe for Postgres / shell" symbol set (`- _ . ~ + = ^`). Every selected set appears at least once. Shows entropy, can generate up to 50 at once, and has copy buttons. Nothing is stored or sent.
- **Case converter**: UPPERCASE, lowercase, Title Case, Sentence case and tOGGLE case, with copy, clear, and character and word counts.
