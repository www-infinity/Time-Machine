# Time Machine — Emoji Signal Network

> Time traveling hydrogen compression · Gallium diode flux capacitor · Hydrogen Host powered

A full-featured, professional website for the **Time Machine** network built on the Hydrogen Host signal layer.

## Features

### 📱 Emoji Phone Number System
- Every device gets a unique **8-block emoji identifier** derived from a device fingerprint
- Format: `😎🟦👌🟥🎷🟨♣️⬜` — always yours, always the same
- As the network grows, numbers automatically expand (8 → 9 → 10 blocks)
- **Click-to-dial** any number in the directory
- **Scan history** shows device connection origins

### 📡 Signal Generator
- Real **Web Audio API** oscillator — sine, square, sawtooth, triangle waveforms
- Canvas waveform visualizer with frequency/amplitude/modulation controls
- **Network scan** tool — find nearby devices and dial them instantly
- Live frequency readout and transmission status

### 🗂 Network Directory
- Searchable, sortable list of all registered members
- Click any **emoji number block** to copy it
- One-tap **📞 Dial** button on every entry
- Online/offline status with last-seen timestamps

### 🖼 Gallery
- Full-width hero image + masonry grid
- **Lightbox** with keyboard navigation (← → Esc)
- Nature, space, technology and signal-themed imagery

### 📺 Videos
- Featured video with play overlay
- Video card grid with thumbnail, duration, and view count

### 🌐 Social
- Post your emoji number to any platform (copy-paste ready)
- Platform tiles: Twitter/X, Instagram, YouTube, Discord, GitHub, Reddit
- Live-updating **community post feed** with like, reply, dial and share

### 💬 Discussions
- Post threads with category tags: General, Signal, Numbers, Nature, Music
- Inline **reply threads** — expand, collapse, add replies
- Like counter on each post

## Hydrogen Host Integration

`js/hydrogen-host.js` is the bridge layer. When the Hydrogen Host API is live, replace the `STUB` sections with:

```js
fetch(`${HYDROGEN_HOST_API}/register`, { method: 'POST', body: JSON.stringify(session) })
HydrogenHostSDK.call(emojiNumber)
```

The public interface (`window.HH`) stays the same — no other files need changing.

## Structure

```
index.html              — Main site
css/style.css           — Dark futuristic theme, responsive
js/hydrogen-host.js     — HH bridge (device ID, registry, dial, scan)
js/phone.js             — Emoji number UI (claim, re-roll, copy, share)
js/signal.js            — Signal generator (canvas + Web Audio)
js/app.js               — Directory, gallery, videos, social, discussions
```

## Quick Start

Open `index.html` in any modern browser — no build step needed.

