const PROFILE_KEY = "life-remaining";
const CUSTOM_KEY = "life-remaining-custom";
const YEAR = 365.2425 * 24 * 60 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;

// Shown to every visitor until they calculate their own. Everything is derived
// from the date of birth and the current moment, so the countdown is always
// live: open it in 2029 and it counts down from 2029.
const DEFAULT_PROFILE = {
  name: "Akash Srivastava",
  dob: "2000-08-04",
  place: "Delhi",
  years: PLACES.find((p) => p.name === "Delhi").years
};

const pad2 = (n) => String(n).padStart(2, "0");
// "YYYY-MM-DD" -> local midnight of that day, in ms
function parseDob(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d).getTime();
}
function toDobString(ms) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
// Calendar age: whole years since birth plus days since the last birthday
function exactAge(dobMs, now = new Date()) {
  const b = new Date(dobMs);
  let years = now.getFullYear() - b.getFullYear();
  let lastBirthday = new Date(now.getFullYear(), b.getMonth(), b.getDate());
  if (lastBirthday > now) {
    years -= 1;
    lastBirthday = new Date(now.getFullYear() - 1, b.getMonth(), b.getDate());
  }
  const days = Math.floor((now - lastBirthday) / DAY);
  return { years, days };
}

const QUOTES = [
  ["It is not that we have a short time to live, but that we waste a lot of it.", "Seneca"],
  ["You could leave life right now. Let that determine what you do and say and think.", "Marcus Aurelius"],
  ["Do not act as if you were going to live ten thousand years.", "Marcus Aurelius"],
  ["While we are postponing, life speeds by.", "Seneca"],
  ["The trouble is, you think you have time.", "Jack Kornfield"],
  ["How we spend our days is, of course, how we spend our lives.", "Annie Dillard"],
  ["Begin at once to live, and count each separate day as a separate life.", "Seneca"],
  ["Death smiles at us all. All a man can do is smile back.", "Marcus Aurelius"]
];


const WEEKS_PER_YEAR = 52; // grid rows are years of 52 weeks
const VIEW_KEY = "life-remaining-view";

const $ = (id) => document.getElementById(id);
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---------- storage (wrapped: may be unavailable) ----------
function read(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}
function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}
function remove(key) {
  try { localStorage.removeItem(key); } catch {}
}

function loadProfile() {
  const p = read(PROFILE_KEY);
  if (!p) return null;
  let profile = null;
  if (p.dob) profile = p;
  // Older versions stored an age instead of a date of birth; estimate the date
  // so returning visitors keep their timer (they can correct it in the form).
  else if (p.anchor !== undefined && p.age !== undefined) {
    profile = { name: p.name, place: p.place, years: p.years, dob: toDobString(p.anchor - p.age * YEAR) };
  } else if (p.birth !== undefined) {
    profile = { name: p.name, place: p.place, years: p.lifeYears, dob: toDobString(p.birth) };
  }
  // Built-in places always use the current verified figure, even if the
  // profile was saved before the data was corrected.
  const known = profile && PLACES.find((x) => x.name === profile.place);
  if (known) profile.years = known.years;
  return profile;
}

const customPlaces = () => read(CUSTOM_KEY) || [];
const allPlaces = () => [...customPlaces(), ...PLACES];

// ---------- timer ----------
let profile = null;
let birth = 0;
let end = 0;
let prevDigits = "";
let prevSecond = null;
let rafId = null;

function showProfile(p) {
  profile = p;
  birth = parseDob(p.dob);
  end = birth + p.years * YEAR;
  prevSecond = null;

  const isDefault = p === DEFAULT_PROFILE;
  $("name").textContent = p.name;
  updateTitle();
  updateMeta();
  drawWeeks();

  const firstName = p.name.split(" ")[0];
  $("cta-kicker").textContent = isDefault ? `This is ${firstName}'s time.` : "Not you?";
  $("cta-title").textContent = isDefault ? "How much of yours is left?" : "Calculate for someone else.";
  $("reset").hidden = isDefault;

  cancelAnimationFrame(rafId);
  const loop = () => {
    render();
    rafId = requestAnimationFrame(loop);
  };
  loop();
}

function render() {
  const now = Date.now();
  const remaining = Math.max(0, end - now);
  const second = Math.floor(remaining / 1000);

  if (second !== prevSecond) {
    if (prevSecond !== null) playTick();
    prevSecond = second;
    renderDigits(second.toLocaleString("en-US"));
    renderBreakdown(remaining);
    document.body.classList.toggle("expired", remaining === 0);
  }

  // The life bar barely moves, so the numbers carry the motion: enough
  // decimals that they visibly drain every frame.
  const lifePct = (remaining / (end - birth)) * 100;
  $("life-fill").style.width = `${lifePct}%`;
  $("life-pct").textContent = `${lifePct.toFixed(9)}% left`;
  $("lived").textContent = ((now - birth) / YEAR).toFixed(8);
  $("left").textContent = (remaining / YEAR).toFixed(8);

  // Today: a zoomed-in view where the drain is actually visible
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const dayPct = ((midnight - now) / DAY) * 100;
  $("day-fill").style.width = `${dayPct}%`;
  $("day-pct").textContent = `${dayPct.toFixed(5)}% left`;
}

function renderDigits(str) {
  const el = $("digits");
  if (str.length !== prevDigits.length) {
    el.innerHTML = [...str].map((c) => `<span class="${c === "," ? "sep" : "d"}">${c}</span>`).join("");
  } else if (!reduceMotion) {
    for (let i = 0; i < str.length; i++) {
      if (str[i] === prevDigits[i]) continue;
      const span = el.children[i];
      span.textContent = str[i];
      span.classList.remove("tick");
      void span.offsetWidth; // restart the animation
      span.classList.add("tick");
    }
  } else {
    el.textContent = str;
  }
  prevDigits = str;
}

function renderBreakdown(ms) {
  const y = Math.floor(ms / YEAR); ms -= y * YEAR;
  const d = Math.floor(ms / DAY);  ms -= d * DAY;
  const h = Math.floor(ms / 3.6e6); ms -= h * 3.6e6;
  const m = Math.floor(ms / 6e4);   ms -= m * 6e4;
  const s = Math.floor(ms / 1000);
  const pad = (n) => String(n).padStart(2, "0");
  const values = { y, d, h: pad(h), m: pad(m), s: pad(s) };
  document.querySelectorAll("#breakdown b").forEach((b) => {
    b.textContent = values[b.dataset.k];
  });
}

// "Delhi · average life 75.8 yrs · born 4 Aug 2000 · age 26y 81d"
function updateMeta() {
  if (!profile) return;
  const { years, days } = exactAge(birth);
  const born = new Date(birth).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const place = allPlaces().find((x) => x.name === profile.place);
  const source = place && place.src ? ` (${SOURCES[place.src]})` : "";
  $("meta").textContent = `${profile.place} · average life ${profile.years} yrs${source} · born ${born} · age ${years}y ${days}d`;
}
setInterval(updateMeta, 60 * 1000);

// ---------- tab title countdown ----------
// Runs on a timer rather than requestAnimationFrame, which stops in background
// tabs. Browsers may slow it to once a minute after a tab is hidden for a while.
function updateTitle() {
  if (!profile) return;
  const secs = Math.floor(Math.max(0, end - Date.now()) / 1000);
  document.title = `${secs.toLocaleString("en-US")}s left · ${profile.name}`;
}
setInterval(updateTitle, 1000);

// ---------- life in weeks ----------
function drawWeeks() {
  const view = $("view-weeks");
  if (view.hidden || !profile) return;

  const wrap = $("weeks-wrap");
  const canvas = $("weeks");
  const W = wrap.clientWidth;
  const H = wrap.clientHeight;
  if (!W || !H) return;

  const years = profile.years;
  const total = Math.ceil(years * WEEKS_PER_YEAR);
  const rowsOfYears = Math.ceil(years);
  const livedYears = (Date.now() - birth) / YEAR;
  const current = Math.min(total, Math.floor(livedYears * WEEKS_PER_YEAR));

  // Pick the orientation that gives the biggest dots: years as rows (portrait)
  // or years as columns (landscape).
  const cellPortrait = Math.min(W / WEEKS_PER_YEAR, H / rowsOfYears);
  const cellLandscape = Math.min(W / rowsOfYears, H / WEEKS_PER_YEAR);
  const portrait = cellPortrait >= cellLandscape;
  const cell = Math.floor(Math.max(cellPortrait, cellLandscape) * 10) / 10;
  const cols = portrait ? WEEKS_PER_YEAR : rowsOfYears;
  const rows = portrait ? rowsOfYears : WEEKS_PER_YEAR;
  const ox = (W - cols * cell) / 2;
  const oy = (H - rows * cell) / 2;
  const pos = (i) => {
    const year = Math.floor(i / WEEKS_PER_YEAR);
    const week = i % WEEKS_PER_YEAR;
    const c = portrait ? week : year;
    const r = portrait ? year : week;
    return [ox + c * cell + cell / 2, oy + r * cell + cell / 2];
  };

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);

  const r = Math.max(0.8, cell * 0.32);
  for (let i = 0; i < total; i++) {
    const [x, y] = pos(i);
    ctx.fillStyle = i < current ? "rgba(227, 184, 115, 0.62)" : "rgba(241, 237, 228, 0.13)";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const dot = $("now-dot");
  dot.hidden = current >= total;
  if (!dot.hidden) {
    const [x, y] = pos(current);
    const size = Math.max(4, cell * 0.85);
    Object.assign(dot.style, { left: `${x}px`, top: `${y}px`, width: `${size}px`, height: `${size}px` });
  }

  const fmt = (n) => n.toLocaleString("en-US");
  $("weeks-caption").innerHTML =
    `<b class="lived">${fmt(current)}</b> weeks lived · <b>${fmt(Math.max(0, total - current))}</b> weeks left · each dot is one week`;
}

function setView(view) {
  $("view-seconds").hidden = view !== "seconds";
  $("view-weeks").hidden = view !== "weeks";
  document.body.classList.toggle("weeks-mode", view === "weeks");
  document.querySelectorAll(".view-toggle button").forEach((b) => {
    b.setAttribute("aria-selected", String(b.dataset.view === view));
  });
  write(VIEW_KEY, view);
  drawWeeks();
}

document.querySelectorAll(".view-toggle button").forEach((b) => {
  b.addEventListener("click", () => setView(b.dataset.view));
});
new ResizeObserver(drawWeeks).observe($("weeks-wrap"));
// redraw hourly so the glowing week moves on without a reload
setInterval(drawWeeks, 60 * 60 * 1000);

// ---------- sound: cosmic music + soft ticks (off by default, never remembered) ----------
// Generated live with Web Audio: no audio file, no licensing, works offline.
// The music keeps evolving: warm pads drift through a slow chord progression,
// random star-like chimes sparkle across the stereo field, and everything sits
// in a long generated reverb. The tick is a gentle tuned "drop" in the same key
// and reverb, so it belongs to the music instead of fighting it.
const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12); // MIDI note -> Hz
// Dreamy progression in A minor / C major: Fmaj9 → Am9 → Cmaj7 → Em7(add11)
const CHORDS = [
  [41, 53, 57, 60, 64, 67],
  [45, 52, 55, 59, 60, 64],
  [36, 52, 55, 59, 62, 67],
  [40, 52, 55, 59, 62, 69]
];
const CHIME_NOTES = [69, 72, 74, 76, 79, 81, 84, 86, 88]; // A minor pentatonic, high
const CHORD_SECONDS = 14;

let soundOn = false;
let audioCtx = null;
let music = null; // live graph + timers while sound is on
let tickFlip = false;

function makeReverb(ctx, seconds) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  }
  const conv = ctx.createConvolver();
  conv.buffer = ir;
  return conv;
}

function startMusic() {
  if (music) return;
  const ctx = audioCtx;
  const t = ctx.currentTime;

  const out = ctx.createDynamicsCompressor();
  out.connect(ctx.destination);

  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, t);
  master.gain.exponentialRampToValueAtTime(0.55, t + 5);
  master.connect(out);

  const reverb = makeReverb(ctx, 7);
  const wet = ctx.createGain();
  wet.gain.value = 0.9;
  reverb.connect(wet).connect(master);

  const dry = ctx.createGain();
  dry.gain.value = 0.35;
  dry.connect(master);

  // pads pass through a warm low-pass whose cutoff slowly wanders
  const padFilter = ctx.createBiquadFilter();
  padFilter.type = "lowpass";
  padFilter.frequency.value = 1100;
  padFilter.Q.value = 0.5;
  padFilter.connect(dry);
  padFilter.connect(reverb);
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.035;
  const lfoDepth = ctx.createGain();
  lfoDepth.gain.value = 600;
  lfo.connect(lfoDepth).connect(padFilter.frequency);
  lfo.start(t);

  music = { out, master, reverb, dry, padFilter, lfo, voices: new Set(), chord: 0, timers: [] };
  playChord();
  music.timers.push(setInterval(playChord, CHORD_SECONDS * 1000));
  scheduleChime(2500);
}

// Each chord fades in over ~6s while the previous one fades out over ~9s,
// so the harmony is always moving and never cuts.
function playChord() {
  if (!music || document.hidden) return;
  const ctx = audioCtx;
  const t = ctx.currentTime;

  for (const v of music.voices) {
    v.gain.gain.cancelScheduledValues(t);
    v.gain.gain.setValueAtTime(Math.max(v.gain.gain.value, 0.0001), t);
    v.gain.gain.exponentialRampToValueAtTime(0.0001, t + 9);
    v.oscs.forEach((o) => o.stop(t + 9.2));
    music.voices.delete(v);
  }

  const chord = CHORDS[music.chord];
  music.chord = (music.chord + 1) % CHORDS.length;

  chord.forEach((note, i) => {
    const isBass = i === 0;
    const gain = ctx.createGain();
    const level = isBass ? 0.09 : 0.035;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(level, t + 6);
    const pan = ctx.createStereoPanner();
    pan.pan.value = isBass ? 0 : (i % 2 ? -1 : 1) * (0.25 + Math.random() * 0.45);
    gain.connect(pan).connect(music.padFilter);

    const oscs = [];
    if (isBass) {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = NOTE(note);
      oscs.push(o);
    } else {
      // two slightly detuned saws give a slow, shimmering chorus
      for (const cents of [-7, 7]) {
        const o = ctx.createOscillator();
        o.type = "sawtooth";
        o.frequency.value = NOTE(note);
        o.detune.value = cents + (Math.random() * 4 - 2);
        oscs.push(o);
      }
    }
    oscs.forEach((o) => { o.connect(gain); o.start(t); });
    music.voices.add({ gain, oscs });
  });
}

// Random soft bell notes: stars appearing and fading in the distance
function scheduleChime(delay) {
  const id = setTimeout(() => {
    if (!music) return;
    if (!document.hidden) {
      playBell(CHIME_NOTES[Math.floor(Math.random() * CHIME_NOTES.length)], 0.05 + Math.random() * 0.04, Math.random() * 1.6 - 0.8, 4);
      // now and then a second, quieter echo-note follows
      if (Math.random() < 0.35) {
        setTimeout(() => music && playBell(CHIME_NOTES[Math.floor(Math.random() * CHIME_NOTES.length)], 0.03, Math.random() * 1.6 - 0.8, 4), 400 + Math.random() * 700);
      }
    }
    scheduleChime(1800 + Math.random() * 4200);
  }, delay);
  music.timers.push(id);
}

// A bell = sine fundamental + quiet inharmonic partial, fast attack, long decay
function playBell(note, level, panValue, decay) {
  const ctx = audioCtx;
  const t = ctx.currentTime;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(level, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  const pan = ctx.createStereoPanner();
  pan.pan.value = panValue;
  gain.connect(pan);
  pan.connect(music.reverb);
  pan.connect(music.dry);

  const freq = NOTE(note);
  [[1, 1], [2.76, 0.18]].forEach(([ratio, amp]) => {
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = freq * ratio;
    const g = ctx.createGain();
    g.gain.value = amp;
    o.connect(g).connect(gain);
    o.start(t);
    o.stop(t + decay + 0.1);
  });
}

// The tick: a soft, short tuned drop in the music's key, alternating two
// notes (tick / tock) and washed in the same reverb.
function playTick() {
  if (!soundOn || !music || document.hidden) return;
  tickFlip = !tickFlip;
  playBell(tickFlip ? 93 : 88, 0.022, tickFlip ? 0.15 : -0.15, 0.35);
}

function stopMusic() {
  if (!music) return;
  const m = music;
  music = null;
  m.timers.forEach((id) => { clearTimeout(id); clearInterval(id); });
  const t = audioCtx.currentTime;
  m.master.gain.cancelScheduledValues(t);
  m.master.gain.setValueAtTime(Math.max(m.master.gain.value, 0.0001), t);
  m.master.gain.exponentialRampToValueAtTime(0.0001, t + 2);
  m.lfo.stop(t + 2.1);
  m.voices.forEach((v) => v.oscs.forEach((o) => o.stop(t + 2.1)));
  setTimeout(() => m.out.disconnect(), 3000);
}

$("sound").addEventListener("click", () => {
  soundOn = !soundOn;
  const btn = $("sound");
  btn.setAttribute("aria-pressed", String(soundOn));
  btn.setAttribute("aria-label", soundOn ? "Sound on" : "Sound off");
  if (soundOn) {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    audioCtx.resume();
    startMusic();
    toast("Sound on · music + ticks");
  } else {
    stopMusic();
    toast("Sound off");
  }
});

// silence everything while the tab is hidden; pick up again on return
document.addEventListener("visibilitychange", () => {
  if (!audioCtx) return;
  if (document.hidden) audioCtx.suspend();
  else if (soundOn) audioCtx.resume();
});

// ---------- share ----------
let toastTimer = null;
function toast(message) {
  const el = $("toast");
  el.textContent = message;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2400);
}

$("share").addEventListener("click", async () => {
  const secs = Math.floor(Math.max(0, end - Date.now()) / 1000).toLocaleString("en-US");
  const who = profile === DEFAULT_PROFILE ? `${profile.name.split(" ")[0]} has` : "I have";
  const text = `${who} ${secs} seconds left on this planet. How many do you have?`;
  const url = location.protocol.startsWith("http") ? location.origin + location.pathname : "";

  if (navigator.share) {
    try {
      await navigator.share({ title: "Life Remaining", text, url: url || undefined });
      return;
    } catch (e) {
      if (e.name === "AbortError") return;
    }
  }
  const full = url ? `${text} ${url}` : text;
  try {
    await navigator.clipboard.writeText(full);
    toast("Copied — paste it anywhere");
  } catch {
    // Older browsers / blocked clipboard API: fall back to a hidden textarea
    const ta = document.createElement("textarea");
    ta.value = full;
    ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;opacity:0;top:0;left:0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    toast(ok ? "Copied — paste it anywhere" : "Couldn't copy on this browser");
  }
});

// ---------- remove the old offline worker ----------
// The site used to be installable with an offline service worker. Installing
// was dropped (it's used straight from the browser), so clear any worker and
// cache that earlier visits left behind.
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations()
    .then((regs) => regs.forEach((r) => r.unregister()))
    .catch(() => {});
}
if ("caches" in window) {
  caches.keys()
    .then((keys) => keys.filter((k) => k.startsWith("life-remaining")).forEach((k) => caches.delete(k)))
    .catch(() => {});
}

// ---------- quotes ----------
let quoteIndex = Math.floor(Math.random() * QUOTES.length);
function showQuote() {
  const [text, who] = QUOTES[quoteIndex];
  $("quote").innerHTML = `“${text}”<cite>${who}</cite>`;
}
setInterval(() => {
  $("quote").classList.add("out");
  setTimeout(() => {
    quoteIndex = (quoteIndex + 1) % QUOTES.length;
    showQuote();
    $("quote").classList.remove("out");
  }, 1200);
}, 18000);

// ---------- modal ----------
function openModal() {
  const saved = loadProfile();
  $("in-name").value = saved ? saved.name : "";
  $("in-dob").value = saved ? saved.dob : "";
  $("in-dob").max = toDobString(Date.now());
  setPlace(saved ? allPlaces().find((p) => p.name === saved.place) || null : null);
  $("form-error").textContent = "";
  $("modal").hidden = false;
  document.body.style.overflow = "hidden";
  // On phones, focusing would pop the keyboard over the sheet as it slides up
  if (matchMedia("(hover: hover) and (min-width: 720px)").matches) {
    setTimeout(() => $("in-name").focus(), 50);
  }
}

function closeModal() {
  closeCombo();
  $("modal").hidden = true;
  document.body.style.overflow = "";
}

$("open-top").addEventListener("click", openModal);
$("open-cta").addEventListener("click", openModal);
document.querySelectorAll("[data-close]").forEach((el) => el.addEventListener("click", closeModal));

$("reset").addEventListener("click", () => {
  remove(PROFILE_KEY);
  showProfile(DEFAULT_PROFILE);
  window.scrollTo({ top: 0, behavior: "smooth" });
});

$("form").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = $("in-name").value.trim();
  const dob = $("in-dob").value; // "YYYY-MM-DD" from the date picker
  const dobMs = dob ? parseDob(dob) : NaN;
  const error = !name ? "Tell us your name."
    : !dob || Number.isNaN(dobMs) ? "Enter your date of birth."
    : dobMs > Date.now() ? "Date of birth can't be in the future."
    : exactAge(dobMs).years > 120 ? "Enter a date of birth within the last 120 years."
    : !selectedPlace ? "Choose a place."
    : "";
  $("form-error").textContent = error;
  if (error) return;

  const p = { name, dob, place: selectedPlace.name, years: selectedPlace.years };
  write(PROFILE_KEY, p);
  closeModal();
  showProfile(p);
  window.scrollTo({ top: 0, behavior: "smooth" });
});

// ---------- place combobox ----------
let selectedPlace = null;
let visibleOptions = [];
let activeIndex = -1;
const GROUP_ORDER = [["Custom", "Your places"], ["City", "Cities"], ["State", "States"], ["Country", "Countries"]];

const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function setPlace(place) {
  selectedPlace = place;
  const v = $("combo-value");
  const pill = $("combo-years");
  v.classList.toggle("placeholder", !place);
  v.textContent = place ? `${place.name}, ${place.region}` : "Select country, state or city";
  pill.hidden = !place;
  pill.textContent = place ? `${place.years} yrs` : "";
}

function openCombo() {
  $("combo-panel").hidden = false;
  $("combo-trigger").setAttribute("aria-expanded", "true");
  $("combo-search").value = "";
  $("combo-add").hidden = true;
  renderOptions();
  $("combo-search").focus({ preventScroll: true });
  // keep the search box and list in view inside the sheet (above the keyboard)
  setTimeout(() => $("combo").scrollIntoView({ block: "start", behavior: "smooth" }), 250);
}

function closeCombo() {
  $("combo-panel").hidden = true;
  $("combo-trigger").setAttribute("aria-expanded", "false");
}

function renderOptions() {
  const q = norm($("combo-search").value);
  const matches = allPlaces().filter((p) => !q || norm(p.name).includes(q) || norm(p.region).includes(q));
  // names that start with the query rank first
  matches.sort((a, b) => (norm(b.name).startsWith(q) ? 1 : 0) - (norm(a.name).startsWith(q) ? 1 : 0));

  visibleOptions = [];
  let html = "";
  for (const [type, label] of GROUP_ORDER) {
    const group = matches.filter((p) => p.type === type);
    if (!group.length) continue;
    html += `<li class="group" role="presentation">${label}</li>`;
    for (const p of group) {
      const i = visibleOptions.push(p) - 1;
      const sel = selectedPlace && selectedPlace.name === p.name && selectedPlace.type === p.type;
      html += `<li class="option" role="option" data-i="${i}" aria-selected="${!!sel}">
        <span class="o-check">${sel ? "✓" : ""}</span>
        <span class="o-text"><span class="o-name">${escapeHtml(p.name)}</span><span class="o-region">${escapeHtml(p.region)}</span></span>
        <span class="o-years">${p.years} yrs</span></li>`;
    }
  }
  $("combo-count").textContent = `${matches.length} places`;

  const raw = $("combo-search").value.trim();
  const exact = matches.some((p) => norm(p.name) === q);
  if (raw && !exact) {
    const i = visibleOptions.push({ add: raw }) - 1;
    if (!matches.length) html += `<li class="empty">No match for “${escapeHtml(raw)}”</li>`;
    html += `<li class="option add-option" role="option" data-i="${i}">＋ Add “${escapeHtml(raw)}” as a custom place</li>`;
  }
  if (!visibleOptions.length) html = `<li class="empty">Type a place name to add it</li>`;

  $("combo-list").innerHTML = html;
  // highlight the closest name match (exact, then prefix), not just the first row
  const exactIdx = visibleOptions.findIndex((p) => p.name && norm(p.name) === q);
  const prefixIdx = visibleOptions.findIndex((p) => p.name && norm(p.name).startsWith(q));
  const best = q ? (exactIdx >= 0 ? exactIdx : prefixIdx) : -1;
  setActive(best >= 0 ? best : visibleOptions.length ? 0 : -1);
}

function setActive(i) {
  activeIndex = i;
  $("combo-list").querySelectorAll(".option").forEach((li) => {
    const on = Number(li.dataset.i) === i;
    li.classList.toggle("active", on);
    // scroll only the list itself, never the sheet or page
    if (on) {
      const list = $("combo-list");
      if (li.offsetTop < list.scrollTop) list.scrollTop = li.offsetTop - 30;
      else if (li.offsetTop + li.offsetHeight > list.scrollTop + list.clientHeight) {
        list.scrollTop = li.offsetTop + li.offsetHeight - list.clientHeight;
      }
    }
  });
}

function choose(i) {
  const item = visibleOptions[i];
  if (!item) return;
  if (item.add) {
    $("add-name").textContent = item.add;
    $("combo-add").hidden = false;
    $("combo-add").dataset.name = item.add;
    $("add-years").value = "";
    $("add-years").focus();
    return;
  }
  setPlace(item);
  closeCombo();
  $("combo-trigger").focus();
}

function addCustomPlace() {
  const name = $("combo-add").dataset.name;
  const years = Number($("add-years").value);
  if (!name || !Number.isFinite(years) || years < 20 || years > 120) {
    $("add-years").focus();
    $("add-years").classList.add("invalid");
    return;
  }
  $("add-years").classList.remove("invalid");
  const place = { type: "Custom", name, region: "Custom place", years: Math.round(years * 10) / 10 };
  write(CUSTOM_KEY, [place, ...customPlaces().filter((p) => norm(p.name) !== norm(name))]);
  setPlace(place);
  closeCombo();
  $("combo-trigger").focus();
}

$("combo-trigger").addEventListener("click", () => {
  $("combo-panel").hidden ? openCombo() : closeCombo();
});

$("combo-search").addEventListener("input", () => {
  $("combo-add").hidden = true;
  renderOptions();
});

$("combo-search").addEventListener("keydown", (e) => {
  if (e.key === "ArrowDown") { e.preventDefault(); setActive(Math.min(activeIndex + 1, visibleOptions.length - 1)); }
  else if (e.key === "ArrowUp") { e.preventDefault(); setActive(Math.max(activeIndex - 1, 0)); }
  else if (e.key === "Enter") { e.preventDefault(); choose(activeIndex); }
  else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); closeCombo(); $("combo-trigger").focus(); }
});

$("combo-list").addEventListener("click", (e) => {
  const li = e.target.closest(".option");
  if (li) choose(Number(li.dataset.i));
});

$("combo-list").addEventListener("mousemove", (e) => {
  const li = e.target.closest(".option");
  if (li && Number(li.dataset.i) !== activeIndex) setActive(Number(li.dataset.i));
});

$("add-confirm").addEventListener("click", addCustomPlace);
$("add-years").addEventListener("keydown", (e) => {
  if (e.key === "Enter") { e.preventDefault(); addCustomPlace(); }
  if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); closeCombo(); }
});

document.addEventListener("click", (e) => {
  if (!$("combo").contains(e.target)) closeCombo();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !$("modal").hidden) {
    if (!$("combo-panel").hidden) closeCombo();
    else closeModal();
  }
});

// ---------- starfield ----------
function starfield() {
  const canvas = $("stars");
  const ctx = canvas.getContext("2d");
  let w, h, stars;

  const newStar = (y) => ({
    x: Math.random() * w,
    y: y ?? Math.random() * h,
    r: Math.random() * 1.1 + 0.2,
    phase: Math.random() * Math.PI * 2,
    speed: Math.random() * 0.0015 + 0.0004,
    drift: Math.random() * 0.06 + 0.01,
    life: 1,
    dying: false
  });

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = innerWidth;
    h = innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars = Array.from({ length: Math.round((w * h) / 7000) }, () => newStar());
  }

  function frame(t) {
    ctx.clearRect(0, 0, w, h);
    // now and then a star flares and fades out: a life ending somewhere
    if (Math.random() < 0.004) stars[Math.floor(Math.random() * stars.length)].dying = true;

    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      s.y -= s.drift;
      if (s.dying) s.life -= 0.006;
      if (s.life <= 0 || s.y < -2) { stars[i] = newStar(h + 2); continue; }

      const twinkle = 0.35 + 0.65 * Math.abs(Math.sin(t * s.speed + s.phase));
      const flare = s.dying ? 1 + (1 - s.life) * 3 : 1;
      ctx.globalAlpha = Math.min(1, twinkle * s.life * (s.dying ? 1.5 : 1));
      ctx.fillStyle = s.dying ? "#ffcf94" : "#f1ede4";
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * flare, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (!reduceMotion) requestAnimationFrame(frame);
  }

  resize();
  addEventListener("resize", resize);
  requestAnimationFrame(frame);
}

// ---------- boot ----------
showQuote();
starfield();
showProfile(loadProfile() || DEFAULT_PROFILE);
setView(read(VIEW_KEY) === "weeks" ? "weeks" : "seconds");
