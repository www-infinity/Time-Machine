/**
 * hydrogen-host.js
 * Bridge layer to the Hydrogen Host Signal Network.
 *
 * When the Hydrogen Host repo is available, replace the
 * STUB implementations below with real API calls to:
 *   HydrogenHost.register(emojiNumber, deviceId)
 *   HydrogenHost.resolve(emojiNumber)
 *   HydrogenHost.dial(emojiNumber)
 *   HydrogenHost.scan()
 *
 * The interface exposed here (window.HH) is the same regardless
 * of whether the real backend is connected.
 */

(function () {
  'use strict';

  /* ── Config ─────────────────────────────────────────── */
  const HYDROGEN_HOST_API = 'https://api.hydrogenhost.network/v1'; // replace when live
  const STORAGE_KEY       = 'hh_registry';
  const SESSION_KEY       = 'hh_session';
  const MAX_SCAN_RESULTS  = 8;
  const CURRENT_BASE_LEN  = 8; // grows as network grows
  const DAY_MS            = 24 * 60 * 60 * 1000;

  /* ── Helpers ─────────────────────────────────────────── */
  function storageGet(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch (_) { return null; }
  }
  function storageSet(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (_) {}
  }

  /* ── Device fingerprint (stable, privacy-safe) ───────── */
  function getDeviceId() {
    let id = storageGet('hh_device_id');
    if (!id) {
      const parts = [
        navigator.userAgent,
        navigator.language,
        screen.width + 'x' + screen.height,
        new Date().getTimezoneOffset(),
        navigator.hardwareConcurrency || 4,
      ];
      id = cyrb53(parts.join('|')).toString(36);
      storageSet('hh_device_id', id);
    }
    return id;
  }

  /** Fast non-crypto hash (cyrb53) — publicly documented algorithm */
  function cyrb53(str, seed = 0) {
    let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
    for (let i = 0, ch; i < str.length; i++) {
      ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
  }

  /* ── Emoji pool ──────────────────────────────────────── */
  // Curated set — safe for all platforms, visually distinct
  const EMOJI_POOL = [
    // Colors / shapes
    '🟥','🟧','🟨','🟩','🟦','🟪','⬜','⬛','🔴','🟠',
    // Nature
    '🌻','🌿','🍃','🌲','🌊','🔥','❄️','⚡','🌙','☀️',
    // Objects / symbols
    '🎷','🎵','🎸','🎹','🎺','🎻','🥁','🎼','🎤','🎧',
    // Animals
    '🐴','🦅','🦋','🐬','🦁','🐘','🦊','🐺','🦌','🐧',
    // Space / tech
    '🛸','🚀','⚙️','🔭','💡','🔬','📡','⚗️','🧲','🌌',
    // People / actions
    '😎','👌','🤝','🙌','💪','🧠','👁️','✨','💫','⭐',
    // Misc symbols
    '♣️','♠️','♦️','♥️','🔷','🔶','🔸','🔹','💎','🏆',
  ];

  /** Generate deterministic emoji number from device ID */
  function deviceEmojiNumber(deviceId, length) {
    length = length || CURRENT_BASE_LEN;
    const result = [];
    let seed = cyrb53(deviceId, 42);
    for (let i = 0; i < length; i++) {
      seed = cyrb53(deviceId + i, seed);
      result.push(EMOJI_POOL[seed % EMOJI_POOL.length]);
    }
    return result;
  }

  /** Generate a random emoji number (for directory demo members) */
  function randomEmojiNumber(length, seed) {
    length = length || CURRENT_BASE_LEN;
    const result = [];
    let s = seed !== undefined ? seed : Math.floor(Math.random() * 1e9);
    for (let i = 0; i < length; i++) {
      s = cyrb53(s + '' + i, s);
      result.push(EMOJI_POOL[s % EMOJI_POOL.length]);
    }
    return result;
  }

  /* ── Registry (localStorage stub) ────────────────────── */
  function getRegistry() {
    return storageGet(STORAGE_KEY) || [];
  }
  function saveRegistry(reg) {
    storageSet(STORAGE_KEY, reg);
  }
  function getMySession() {
    return storageGet(SESSION_KEY);
  }
  function saveSession(session) {
    storageSet(SESSION_KEY, session);
  }

  /* ── Public API ──────────────────────────────────────── */
  const HH = {
    /** Return the device's deterministic emoji number (array of emoji strings) */
    getMyNumber() {
      const deviceId = getDeviceId();
      return deviceEmojiNumber(deviceId, CURRENT_BASE_LEN);
    },

    /** Generate a fresh random number (for re-roll UI) */
    randomNumber() {
      return randomEmojiNumber(CURRENT_BASE_LEN);
    },

    /**
     * Register a user on the network.
     * @param {string[]} emojiNumber
     * @param {string} handle
     * @param {string} bio
     * @returns {{ ok: boolean, session: object }}
     */
    register(emojiNumber, handle, bio) {
      const deviceId = getDeviceId();
      const reg = getRegistry();
      // prevent duplicate device registrations
      const existing = reg.findIndex(u => u.deviceId === deviceId);
      const session = {
        deviceId,
        emojiNumber,
        handle: handle || 'Anonymous',
        bio: bio || '',
        avatar: emojiNumber[0],
        joined: new Date().toISOString(),
        online: true,
      };
      if (existing >= 0) {
        reg[existing] = session;
      } else {
        reg.unshift(session);
      }
      saveRegistry(reg);
      saveSession(session);

      /* TODO — replace with real call when Hydrogen Host API is live:
         fetch(`${HYDROGEN_HOST_API}/register`, {
           method: 'POST',
           body: JSON.stringify(session),
           headers: { 'Content-Type': 'application/json' }
         });
      */
      return { ok: true, session };
    },

    /** Get current user session if registered */
    getSession() {
      return getMySession();
    },

    /**
     * Get all registered members (local registry + demo members).
     * @returns {object[]}
     */
    getDirectory(count) {
      count = count || 20;
      const registry = getRegistry();

      // Demo members to populate the directory
      const DEMO_HANDLES = [
        { name: 'GreenEngineer 🌻', bio: 'Nature lover · Classical music · Horses 🐴', avatar: '🌿' },
        { name: 'HydrogenPilot', bio: 'Signal explorer · Time traveler', avatar: '🛸' },
        { name: 'FluxCapacitor42', bio: 'Gallium oxide specialist', avatar: '⚙️' },
        { name: 'ClassicalWaves 🎷', bio: 'Bach · Beethoven · Signals', avatar: '🎼' },
        { name: 'NebulaDreamer', bio: 'Stargazer · Amateur astronomer', avatar: '🌌' },
        { name: 'HeliumRider', bio: 'Compression · Decompression · Everything in between', avatar: '💨' },
        { name: 'TimeTraveler_00', bio: 'Been here before. Will be here again.', avatar: '⏱' },
        { name: 'SignalForest', bio: 'Where nature meets technology', avatar: '🌲' },
        { name: 'HorseWhisperer 🐴', bio: 'Equestrian · Outdoors · Classical', avatar: '🐴' },
        { name: 'PhotonicWave', bio: 'Light-speed comms researcher', avatar: '⚡' },
        { name: 'GalliumDiode', bio: 'Solid-state physics nerd', avatar: '💎' },
        { name: 'EchoStation', bio: 'Listening to every frequency', avatar: '📡' },
      ];

      const demo = DEMO_HANDLES.slice(0, Math.max(0, count - registry.length)).map((d, i) => ({
        deviceId: 'demo_' + i,
        emojiNumber: randomEmojiNumber(CURRENT_BASE_LEN, i * 137 + 42),
        handle: d.name,
        bio: d.bio,
        avatar: d.avatar,
        joined: new Date(Date.now() - i * DAY_MS * 3).toISOString(),
        online: i < 4,
        isDemo: true,
      }));

      return [...registry, ...demo].slice(0, count);
    },

    /**
     * Simulate a network scan — returns nearby devices.
     * @returns {object[]}
     */
    scan() {
      const all = HH.getDirectory(MAX_SCAN_RESULTS + 2);
      return all
        .sort(() => Math.random() - 0.5)
        .slice(0, MAX_SCAN_RESULTS)
        .map(u => ({
          ...u,
          signalStrength: Math.floor(50 + Math.random() * 50),
        }));
    },

    /**
     * Dial an emoji number.
     * In production this routes through Hydrogen Host.
     * @param {string[]} emojiNumber
     * @param {string} handle
     */
    dial(emojiNumber, handle) {
      const num = emojiNumber.join('');
      /* TODO — replace with real Hydrogen Host call:
         HydrogenHostSDK.call(emojiNumber);
      */
      // Try to construct a tel: link using the emoji codepoints as digits (demo mode)
      console.info('[HH] Dialling', num, 'for', handle);
      return { status: 'dialling', target: num };
    },

    /** Format an emoji array as a display string */
    formatNumber(arr) {
      return arr.join(' ');
    },

    /** Return the EMOJI_POOL for UI pickers */
    getEmojiPool() {
      return [...EMOJI_POOL];
    },

    /** How many blocks a new user gets today */
    getCurrentBaseLength() {
      return CURRENT_BASE_LEN;
    },
  };

  window.HH = HH;
})();
