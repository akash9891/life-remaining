# Life Remaining

> **We die. Live now.**

A quiet, philosophical web page that counts down the **seconds of life you have left**, based on your date of birth and the average life expectancy where you live.

It's not a prediction, just a reminder that time is finite, so spend it on what matters.

**Live:** https://akash9891.github.io/life-remaining/ *(once GitHub Pages is enabled)*

---

## Features

- **Live countdown:** the seconds remaining, ticking down, with a years / days / hours / minutes / seconds breakdown.
- **Life bar:** the share of life remaining, to 9 decimals so you can watch it drain, plus years lived and years left.
- **Today bar:** how much of today is left before midnight.
- **Life in weeks:** switch to a grid with one dot for every week of a full life. Lived weeks are gold and the current week glows.
- **Calculate your own:** enter your name, date of birth and place.
  - **Search:** a searchable list of countries, Indian and US states, and cities.
  - **Custom places:** add your own if yours isn't listed.
- **Verified data:** every life-expectancy figure comes from an official source, which is shown on the page.
- **Quotes:** rotating lines from Seneca, Marcus Aurelius and others.
- **Optional sound:** a generative cosmic soundtrack with soft ticks, created live in the browser. Off by default.
- **Share:** your countdown, through the phone's share sheet or the clipboard.
- **Tab title countdown:** the browser tab shows the seconds left.
- **Mobile-first:** designed for phones and fits on one screen without scrolling. Also works on tablets and desktop.

## Life expectancy data

All figures are life expectancy at birth, both sexes. They were verified on 24 Oct 2026.

| Places | Source |
|---|---|
| Countries + world average | [UN World Population Prospects 2024](https://population.un.org/wpp/) (2023 values, via [Our World in Data](https://ourworldindata.org/grapher/life-expectancy)) |
| Indian states | [SRS based Abridged Life Tables 2020–24](https://censusindia.gov.in/nada/index.php/catalog/47148), Office of the Registrar General, India |
| US states | [U.S. State Life Tables, 2022](https://www.cdc.gov/nchs/data/nvsr/nvsr74/nvsr74-12.pdf), CDC / NCHS |

Cities use their state's or country's average, because official city-level life tables are rarely published.

## Privacy

There's no backend, no account and no tracking. Your name, date of birth and place are saved **only in your own browser** (`localStorage`) and never leave your device.

## Run locally

It's plain HTML, CSS and JavaScript, with no build step and no dependencies.

- **Simplest:** open `index.html` in a browser.
- **Or serve it locally:**

  ```bash
  npx serve .
  # or
  python -m http.server 8000
  ```

## Deploy (GitHub Pages)

1. Go to the repo's **Settings → Pages**.
2. Under **Source**, choose **Deploy from a branch**.
3. Pick branch **`main`** and folder **`/ (root)`**, then **Save**.

The site goes live at `https://<username>.github.io/life-remaining/` within a minute or two.

## Project structure

```
index.html               page markup: timer, weeks view, form
style.css                mobile-first styles, animations
script.js                countdown, weeks grid, form, sound, share
data/life-expectancy.js  verified life-expectancy data + sources
icons/icon.svg           browser-tab icon (hourglass)
CLAUDE.md                detailed project notes and changelog
```

## Disclaimer

Averages describe populations, not individuals. Your actual life depends on many things no number can capture. Treat the countdown as a nudge to live deliberately, not as a forecast.
