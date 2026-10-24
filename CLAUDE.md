# Life Remaining

> We die. Live now.

Brand line used everywhere in the UI: **"We die · Live now"** (top bar, modal eyebrow, meta description, manifest). It replaced "Memento mori".

## ⚠️ Maintenance Rule (always follow)
**Whenever any code, file, design, feature or decision in this project changes, this CLAUDE.md MUST be updated in the same change.**
Keep the sections below (Status, Structure, Features, Decisions, Changelog) accurate at all times.

## Purpose
A personal, just-for-fun, philosophical web page. Its first view is a large countdown timer showing the **seconds of life remaining**, counting down live.
It runs from a person's current age to the average life expectancy of their place.
It is a daily reminder that life is finite: hurry, and don't waste time on trivial things.

## Scope & Constraints
- Frontend only: no backend, no database, no API calls, no login.
- No deep logic or complex systems. Keep it simple.
- Runs by opening `index.html` in a browser. Hosting on **GitHub Pages** is planned as the next step.

## Tech Stack
- Plain **HTML + CSS + vanilla JavaScript**
- No framework and no build step. React/Vite was considered twice (2026-10-24) and rejected as needless tooling for a single page; revisit only if the app grows to many screens or React learning becomes a goal.
- `localStorage` keys (every access wrapped in try/catch):
  - `life-remaining`: the visitor's profile
  - `life-remaining-custom`: the visitor's custom places
  - `life-remaining-view`: the last view, `seconds` or `weeks`
- Google Fonts: Cormorant Garamond (names, quotes), Inter (UI), JetBrains Mono (numbers, labels)
- PWA: `manifest.webmanifest` + `sw.js` (service worker; registers only over http/https, not `file://`)

## Structure
| File | Purpose |
|---|---|
| `index.html` | Top bar (install / sound / share / calculate), `#timer` with Seconds and Weeks views, quote, CTA, toast, "calculate yours" modal with the place combobox |
| `style.css` | Dark cosmic theme; color tokens on `:root`; animations; mobile rules; reduced-motion support |
| `script.js` | Default profile, countdown loop, digit tick animation, bars, weeks grid, tab-title countdown, tick sound, share, install prompt, service-worker registration, quotes, modal, combobox, custom places, starfield |
| `data/life-expectancy.js` | `PLACES` array of `{ type, name, region, years }`: City / State / Country |
| `manifest.webmanifest` | App name, colors and icons for "install as app" |
| `sw.js` | Offline cache, stale-while-revalidate. **Bump `CACHE` when the file list changes.** |
| `icons/` | `icon.svg` (favicon, hourglass), plus `icon-192.png` and `icon-512.png` (generated with a PowerShell System.Drawing script) |
| `README.md` | Public project overview for GitHub: features, data sources, privacy, run locally, GitHub Pages deploy, structure. Keep it in sync when features or data sources change. |
| `CLAUDE.md` | This document: project source of truth |

## Default Timer
Every visitor first sees the timer for **Akash Srivastava, born 4 Aug 2000, Delhi** (`DEFAULT_PROFILE` in `script.js`, `dob: "2000-08-04"`).
Age and remaining time are always computed from the date of birth and **the current moment**, so the countdown is live whenever the page is opened (e.g. opened in 2029, it counts down from 2029).
Below it, a one-row CTA pill ("This is Akash's time. How much of yours is left? [Calculate your life →]") opens the form so visitors can calculate their own.
Once a visitor submits, their own timer is saved and shown on return. "Back to default" clears it.

## Mobile-first Rule
The site is **primarily for phones**; desktop must still work well.
- `style.css` base styles target a portrait phone. `@media (min-width: 720px)` enhances for tablet/desktop. Hover effects live only in `@media (hover: hover)`.
- **Touch targets** are ≥ 40px (icon buttons 40px, inputs 52px, list rows 52px, primary button 48px).
- **Inputs** are 16px, so iOS doesn't zoom on focus. Safe-area insets (`env(safe-area-inset-*)`) are respected, and `viewport-fit=cover` is set.
- **Phone layout:**
  - the top bar shows only the brand plus icon buttons; the "Calculate yours" text button appears only on desktop
  - the CTA is a stacked card with a full-width button (one pill row on desktop)
  - the modal is a **bottom sheet** with a grab handle (a centred card on desktop)
  - the page behind it doesn't scroll
  - no autofocus on phones, so the keyboard doesn't pop up over the sliding sheet
  - opening the place dropdown scrolls it into view
- Write new UI phone-first, then enhance in the 720px query.

## Layout Rule: one screen, no scrolling
Everything (name, view toggle, digits/weeks grid, breakdown, bars, quote, CTA, meta) must fit in the first viewport.
- `body` is a full-height flex column; `.timer` is `flex: 1` and centred, with spacing `--gap: clamp(6px, 1.7vh, 22px)`
- Font sizes use `min(vw, vh)` clamps so they shrink on short screens
- The Weeks view takes the remaining height (`flex: 1`); its canvas is absolutely positioned so the grid sizes to the space and never pushes the layout
- **Phones show the same details as desktop**: "seconds left on this planet", years lived / years left, and the meta line (place, life expectancy, source, birth date, age). **Never hide these on phones; compact instead** (user request).
- **Phones under 760px tall:** the gap, quote and CTA are tightened.
- **Phones under 700px tall** (common once browser bars are counted): smaller gap, name, digits, tiles, bar text, quote, CTA and meta. Nothing is hidden. Tested down to 360×560.
- **Under 480px tall (phone held sideways):** only the eyebrow, breakdown tiles and Today bar are hidden. The unit line, years lived/left and meta stay, in compact sizes. These rules use an `html` prefix so they beat the later desktop (≥720px) rules, since a sideways phone is wider than 720px.
- **The quote is always shown**, on every screen size and in both views (user request).
- On a visitor's own timer, "Back to default" sits **beside** the CTA button, so it's no taller than the default view.
Keep this rule when adding anything new.

## Inputs (exactly three)
1. **Name**: shown as the big headline
2. **Date of birth**: a native date picker (`#in-dob`, `type="date"`). Its `max` is today and `min` is 1900-01-01. It can't be in the future or more than 120 years ago. (Age is no longer asked; it was inaccurate.)
3. **Place**: a custom combobox. The trigger shows "Name, Region" plus a gold years pill. The panel opens **inline, in the form's flow** (not floating), so it never overlaps the fields below.
   - Inside the panel: a search box with a result count, sticky group headers (Your places / Cities / States / Countries), and rows with a ✓ for the selection, the name, the region and the years
   - Keyboard: ↑/↓ to move, Enter to choose, Esc to close
   - If the search has no exact match: "＋ Add "X" as a custom place" asks for an average life (20–120) and saves the place to localStorage

Gender/sex is deliberately **not** collected.

## Place Data
**Every figure was verified on 2026-10-24** against one official source per category. Each entry carries a `src` key; `SOURCES` in the data file holds the display labels.

| `src` | Covers | Source |
|---|---|---|
| `UN` | 58 countries + world average | UN World Population Prospects 2024, values for 2023 (via [Our World in Data](https://ourworldindata.org/grapher/life-expectancy)) |
| `SRS` | 21 Indian states + Indian cities | [SRS based Abridged Life Tables 2020–24](https://censusindia.gov.in/nada/index.php/catalog/47148), Office of the Registrar General (May 2026), Total |
| `CDC` | 8 US states + US cities | [U.S. State Life Tables, 2022](https://www.cdc.gov/nchs/data/nvsr/nvsr74/nvsr74-12.pdf), NVSR Vol. 74 No. 12 (latest state edition) |

- **Cities** use their state's (or country's) figure, because city-level life tables are rarely published. Chandigarh uses the Punjab average.
- **Delhi = 73.9** (SRS 2020–24; males 72.1, females 76.1). It was 75.8 in the older 2016–20 edition.
- **"India"** is the UN figure (72.0). The SRS all-India figure for 2020–24 is 70.6.
- **The meta line shows the source**, e.g. "Delhi · average life 73.9 yrs (SRS 2020–24) · …".
- **Saved profiles** for built-in places are refreshed to the current figure on load (`loadProfile`).
- **When updating data:** use the same sources' newer editions, update all entries of that category together, and bump `CACHE` in `sw.js`.

## Features
1. **Seconds countdown**: a huge mono number; digits that change slide in with a gold flash.
2. **Breakdown cells**: years / days / hours / minutes / seconds as glass tiles.
3. **Life bar**:
   - shows % of life remaining with 9-decimal precision, plus "years lived" and "years left" to 8 decimals
   - the decimals carry the motion, since the bar itself barely moves
   - styling: gold gradient, travelling shimmer, flickering ember at the burning edge
4. **Today bar**: a thinner bar draining toward midnight.
5. **Life in weeks**: a Seconds | Weeks toggle under the name; the choice is remembered.
   - **Grid:** a canvas of one dot per week. Each row is a year of 52 weeks; the total is `ceil(years × 52)`.
   - **Orientation:** years as rows or as columns, whichever gives the bigger dots.
   - **Colors:** lived weeks are gold, remaining weeks are faint, and the current week has a flickering ember (`#now-dot`).
   - **Caption:** "X weeks lived · Y weeks left · each dot is one week".
   - **Redraws** on resize and every hour.
6. **Tab title countdown**: `document.title = "<seconds>s left · <name>"`, updated by `setInterval` (rAF stops in background tabs; browsers may slow it to once a minute after a while hidden).
7. **Sound**: one speaker button in the top bar, simply **On / Off**. On plays **music + ticks** together, with a toast confirming.
   - Always starts Off and is never remembered. Browsers block autoplay anyway, and surprise sound on phones is unwelcome.
   - **Music** (`startMusic` / `stopMusic`): generative cosmic ambience made live with Web Audio. There is no audio file, so no licensing or download, and it works offline. It keeps evolving instead of looping:
     - **Pads:** warm detuned-saw chords move through Fmaj9 → Am9 → Cmaj7 → Em7(add11), one every 14 s (`CHORDS`, `CHORD_SECONDS`).
       - each chord fades in over 6 s while the previous one fades out over 9 s
       - voices are spread across the stereo field
       - a slowly wandering low-pass filter warms the sound
     - **Star chimes:** random soft bell notes from A minor pentatonic (`CHIME_NOTES`) every 1.8–6 s, panned randomly, sometimes with a quieter echo note.
     - **Space:** a generated 7 s convolution reverb (`makeReverb`) and a compressor; 5 s fade in, 2 s fade out.
   - **Ticks:** a soft, short tuned bell "drop" in the same key and reverb, alternating A6/E6 (tick/tock), so it blends with the music.
   - A pulsing gold dot on the button shows sound is on.
   - All audio is suspended while the tab is hidden, and the schedulers skip while hidden, so nothing bursts out on return.
8. **Share**: uses `navigator.share` where available, otherwise copies to the clipboard with a toast.
   - Text: "<Akash has | I have> N seconds left on this planet. How many do you have?" plus the page URL (only when served over http/https).
9. **Daily question**: **removed** (2026-10-24, user request). Do not re-add it.
10. **Install as app (PWA)**:
    - the manifest, icons and service worker make it installable once hosted
    - **The install button always shows on phones** (`pointer: coarse`) unless already running as the installed app (`display-mode: standalone` / `navigator.standalone`):
      - Chromium (Chrome / Edge / Samsung on Android), which fires `beforeinstallprompt`: tapping shows the native install popup
      - iPhone (any browser), Firefox and others with no install event: tapping opens the `#install-help` sheet with platform steps (iOS: Share → Add to Home Screen; Android: menu ⋮ → Install app / Add to Home screen)
      - Desktop: the button shows only when `beforeinstallprompt` fires
    - it works offline after the first visit
11. **Rotating quotes**: Seneca, Marcus Aurelius and others, blurring in and out every 18 s. **Always visible on phone and desktop.**
12. **Starfield background**: a canvas of slowly drifting, twinkling stars. Now and then one flares gold and fades out, like a life ending. There is also a breathing gold glow and a vignette.
13. **Expired state**: if age ≥ average life, the digits turn gold at 0 and every week dot is filled.

## Decisions
- **Quotes / Acharya Prashant:** we explored adding his teachings. Claude can't copy his copyrighted lines verbatim from the web, and the user didn't want paraphrases, so the idea was **dropped** (2026-10-24). If revisited, the user pastes exact lines and they are added verbatim with attribution.
- **Hindi:** not used anywhere (user's choice).

## Calculation
- `birth = parseDob(dob)` (local midnight of the birth date), `end = birth + years × YEAR` (YEAR = 365.2425 days)
- Exact age (`exactAge`) = calendar years since birth plus days since the last birthday. It's shown in the meta line, e.g. "Delhi · average life 73.9 yrs (SRS 2020–24) · born 4 Aug 2000 · age 26y 81d", refreshed every minute.
- Each frame: `remaining = max(0, end - now)`; `lifePct = remaining / (end - birth)`
- Weeks: `current = floor(((now - birth) / YEAR) × 52)`
- Saved profile: `{ name, dob, place, years }`. Older saved profiles (`{ age, anchor }` or `{ birth, lifeYears }`) are converted to an estimated `dob` on load.

## Testing
How it was tested: headless Chrome driven over the DevTools protocol by a PowerShell script (no Node/Python on this machine). The page was served from a local HttpListener, with mobile emulation (touch, mobile UA, DPR 2). The Claude-in-Chrome extension was not connected.
- **Sizes** (all fit one screen with no horizontal scroll, in both Seconds and Weeks views):
  - phones: 390×664 (iPhone with browser bars), 360×640, 412×780, 390×844, 844×390 (sideways)
  - tablet: 768×1024
  - desktop: 1366×768, 1920×1080
- **Flows that pass:**
  - Default timer: Akash, 47.68 yrs left, Delhi 73.9 (SRS 2020–24).
  - Live ticking, the tab-title countdown and reduced-motion support.
  - Weeks toggle, which is remembered.
  - Form opens as a bottom sheet on phones (no autofocus, page scroll locked) and a centred card with autofocus on desktop.
  - Validation: empty name, future DOB, out-of-range custom years.
  - Search and grouping; Enter picks the exact or prefix match.
  - Custom place saved.
  - Own timer saved and kept across reloads; back to default.
  - Sound on (AudioContext running, music active) and off.
  - Escape closes the dropdown, then the form.
  - No console errors.
- **Not verifiable headless:** the native share sheet and clipboard (no user activation), and service-worker caching. Check these on a real phone after hosting.

## Next
- **Live:** https://akash9891.github.io/life-remaining/ (GitHub Pages, deploys automatically from `main`). The share button is confirmed working on the user's phone. Chrome's installability check on the live site passes (no errors).
- Optional later: an OG image for nicer link previews, a new-tab browser extension.

## Status
- [x] Tech stack chosen
- [x] CLAUDE.md created
- [x] Inputs finalised (name, age, place)
- [x] First implementation
- [x] v2: searchable place dropdown, cities/states/custom places, cosmic UI, default Akash timer + CTA
- [x] v3: one-screen layout, cleaner dropdown, "We die · Live now"
- [x] v4: life in weeks, share, daily question, tab title countdown, tick sound, PWA
- [x] v5: mobile-first rework
- [x] Tested in headless Chrome (2026-10-24): see Testing
- [x] Hosted on GitHub Pages; installability verified by Chrome on the live site
- [ ] Offline mode: user to confirm on a real phone (airplane mode after first visit)
- [ ] Hosting on GitHub Pages

## Changelog
- 2026-10-24: Project started. Tech stack chosen (vanilla HTML/CSS/JS). CLAUDE.md created.
- 2026-10-24: First implementation: setup form (name, age, place), seconds countdown, life bar with 9-decimal percentage, today bar, rotating quotes, localStorage persistence, life-expectancy data for ~58 countries plus a world average.
- 2026-10-24: Reconsidered React; decided to stay vanilla.
- 2026-10-24: v2: custom searchable place combobox with cities, Indian/US states and user-added custom places; `LIFE_EXPECTANCY` map replaced by the `PLACES` array; redesigned cosmic UI (starfield, glow, digit tick animation, glass breakdown tiles, ember bar); default timer for Akash Srivastava (26, Delhi) with a "Calculate your life" CTA and modal form.
- 2026-10-24: v3: whole timer fits one screen (vh-based sizing, compact one-row CTA, inline quote attribution); place dropdown redesigned (inline panel, fixed-height rows, years pill, result count, sticky groups, cleaner custom-place row); "Memento mori" replaced by "We die · Live now".
- 2026-10-24: Acharya Prashant quotes explored and dropped (see Decisions).
- 2026-10-24: v4: Seconds/Weeks view toggle with a life-in-weeks canvas grid; tab-title countdown; optional tick sound; share button (Web Share / clipboard + toast); daily question; PWA (manifest, service worker, SVG + PNG hourglass icons, install button). Delhi corrected from 75.9 to the verified 75.8.
- 2026-10-24: v5: stylesheet rewritten mobile-first (phone base + 720px desktop enhancement, hover-only effects, larger touch targets, 16px inputs, safe areas, bottom-sheet modal, stacked CTA on phones, bigger phone digits/name); scripts: no autofocus on phones, page scroll locked behind the modal, dropdown scrolls into view, the active option scrolls only within the list.
- 2026-10-24: Optional ambient space drone (Web Audio, generated in code) merged with the tick into one sound button cycling Off / Ticks / Ambient / Both; off by default; pauses when the tab is hidden.
- 2026-10-24: Sound reworked: the static drone was replaced by generative cosmic music (evolving chord pads, random star chimes, convolution reverb); the tick became a soft tuned bell in the same key; the sound button is now simple On/Off (On = music + ticks).
- 2026-10-24: Age input replaced by date of birth (native date picker); exact age computed from it; default profile now uses DOB 2000-08-04; the countdown is always computed from the current moment (the fixed anchor date was removed); old saved profiles migrate to an estimated DOB; the meta line shows the birth date and exact age.
- 2026-10-24: All life-expectancy data verified against official sources: UN WPP 2024 (15 of 59 countries corrected, e.g. Thailand 79.7 → 76.4), SRS 2020–24 (all Indian states updated to the latest edition; Delhi 75.8 → 73.9) and CDC 2022 (all 8 US states corrected). Cities follow their state/country. Added `src`/`SOURCES`; the meta line shows the source; saved profiles refresh to the current figure; `sw.js` CACHE bumped to v2.
- 2026-10-24: Tested in headless Chrome across 8 screen sizes. Fixes from testing:
  - 4–29px overflow on iPhone-height screens (tightened spacing at 640–760px)
  - hard-edged dark boxes behind the digits (removed `overflow:hidden` that clipped the glow)
  - form input styles leaking into the dropdown search box (`.field input` → `.field > input`)
  - "Back to default" pushed the page past one screen (now beside the button)
  - tiny weeks grid on phones (quote hidden in Weeks view)
  - sideways-phone overflow (new under-480px rule)
  - search highlighting the first row instead of the best match
  - share fallback (hidden-textarea copy) when the Clipboard API is blocked
- 2026-10-24: Daily question removed entirely (HTML, CSS, `QUESTIONS`/`showQuestion`). Quotes now always shown on phone and desktop (removed the rules that hid them under 640px tall and in phone Weeks view). Re-tested on 8 sizes x 2 views: all fit on one screen.
- 2026-10-24: Phones now show every detail desktop shows. Removed the rule that hid the unit line, years lived/left and the meta line under 640px tall (most real phones are below that with browser bars). Short phones (<700px) compact instead; sideways phones keep those details too (`html`-prefixed rules so they beat the desktop media query). Tested at 360×560, 390×600, 360×640, 390×664, 412×780, 844×390 and 1366×768 in both views: all details visible, all fit on one screen.
- 2026-10-24: Code pushed to GitHub (https://github.com/akash9891/life-remaining, branch `main`). Added README.md (features, verified data sources, privacy, run/deploy steps, structure).
- 2026-10-24: Deployed to GitHub Pages (https://akash9891.github.io/life-remaining/). The install button wasn't visible on the user's phone because only Chromium fires `beforeinstallprompt`. The button now always shows on phones (hidden once installed) and falls back to a how-to sheet (`#install-help`) with iPhone / Android steps. `sw.js` CACHE bumped to v3. Tested with iPhone, Android-Firefox, Android-Chrome and desktop emulation.
