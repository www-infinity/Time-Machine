/**
 * app.js
 * Main application — navbar, scroll animations, directory,
 * gallery, videos, social feed, discussions, feature strip,
 * toast notifications, star canvas.
 * Depends on: window.HH (hydrogen-host.js)
 */

(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════
     UTILITIES
  ══════════════════════════════════════════════════════ */
  function el(id)   { return document.getElementById(id); }
  function qs(sel)  { return document.querySelector(sel); }

  /** Escape user-supplied strings before inserting as HTML */
  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  window.escHtml = escHtml;

  /** Toast notification */
  window.showToast = function (message, type) {
    type = type || 'info';
    const container = el('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast toast--' + type;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 350);
    }, 3200);
  };

  /** Format relative time */
  function relativeTime(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)  return 'just now';
    if (mins < 60) return mins + 'm ago';
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return hrs + 'h ago';
    return Math.floor(hrs / 24) + 'd ago';
  }

  /* ══════════════════════════════════════════════════════
     NAVBAR SCROLL
  ══════════════════════════════════════════════════════ */
  const navbar    = el('navbar');
  const navToggle = el('navToggle');
  const navLinks  = el('navLinks');

  window.addEventListener('scroll', () => {
    if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 30);
  });

  if (navToggle) {
    navToggle.addEventListener('click', () => {
      navLinks.classList.toggle('open');
    });
  }
  // Close mobile menu on link click
  if (navLinks) {
    navLinks.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => navLinks.classList.remove('open'));
    });
  }

  /* ══════════════════════════════════════════════════════
     STAR CANVAS (Hero background)
  ══════════════════════════════════════════════════════ */
  (function initStars() {
    const canvas = el('starCanvas');
    if (!canvas) return;
    const c = canvas.getContext('2d');
    let stars = [];

    function resize() {
      canvas.width  = canvas.parentElement.offsetWidth;
      canvas.height = canvas.parentElement.offsetHeight;
      buildStars();
    }

    function buildStars() {
      stars = [];
      const N = Math.floor((canvas.width * canvas.height) / 4500);
      for (let i = 0; i < N; i++) {
        stars.push({
          x:    Math.random() * canvas.width,
          y:    Math.random() * canvas.height,
          r:    Math.random() * 1.5 + 0.3,
          speed: Math.random() * 0.3 + 0.05,
          opacity: Math.random(),
          pulse:  Math.random() * Math.PI * 2,
        });
      }
    }

    function drawStars() {
      c.clearRect(0, 0, canvas.width, canvas.height);
      stars.forEach(s => {
        s.pulse += 0.01;
        s.y -= s.speed;
        if (s.y < -2) { s.y = canvas.height + 2; s.x = Math.random() * canvas.width; }
        const op = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(s.pulse));
        c.beginPath();
        c.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        c.fillStyle = `rgba(200,220,255,${op * s.opacity})`;
        c.fill();
      });
      requestAnimationFrame(drawStars);
    }

    window.addEventListener('resize', resize);
    resize();
    drawStars();
  })();

  /* ══════════════════════════════════════════════════════
     SCROLL FADE-IN OBSERVER
  ══════════════════════════════════════════════════════ */
  function initScrollObserver() {
    const targets = document.querySelectorAll(
      '.register-card, .register-info .info-block, .dir-entry, .gallery-item, ' +
      '.video-card, .thread-card, .social-post, .social-platform-tile'
    );
    targets.forEach(t => t.classList.add('fade-in-up'));

    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });

    targets.forEach(t => obs.observe(t));
  }

  /* ══════════════════════════════════════════════════════
     FEATURE STRIP (duplicate for infinite scroll)
  ══════════════════════════════════════════════════════ */
  (function initStrip() {
    const strip = qs('.feature-strip-inner');
    if (!strip) return;
    strip.innerHTML += strip.innerHTML; // duplicate for seamless loop
  })();

  /* ══════════════════════════════════════════════════════
     DIRECTORY
  ══════════════════════════════════════════════════════ */
  let dirPage = 12;
  let dirSort = 'recent';
  let dirSearch = '';

  function buildDirEntry(user) {
    const div = document.createElement('div');
    div.className = 'dir-entry fade-in-up';
    div.setAttribute('data-handle', user.handle.toLowerCase());
    div.setAttribute('data-number', user.emojiNumber.join(''));

    const numHtml = user.emojiNumber
      .map(e => `<span class="dir-number-block" title="Block">${e}</span>`)
      .join('');

    div.innerHTML = `
      <div class="dir-avatar ${user.online ? 'online' : ''}">
        ${user.avatar || user.emojiNumber[0]}
      </div>
      <div class="dir-info">
        <div class="dir-handle">${escHtml(user.handle)}</div>
        <div class="dir-number">${numHtml}</div>
        <div class="dir-status">${user.online ? '🟢 Online' : '⚫ ' + relativeTime(user.joined)}</div>
      </div>
      <div class="dir-actions">
        <button class="dial-btn" title="Dial ${escHtml(user.handle)}">📞</button>
      </div>
    `;

    div.querySelector('.dial-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      HH.dial(user.emojiNumber, user.handle);
      window.showToast('📞 Calling ' + user.handle + '…', 'success');
    });

    // Click row to copy number
    div.addEventListener('click', () => {
      const num = HH.formatNumber(user.emojiNumber);
      navigator.clipboard.writeText(num).catch(() => {});
      window.showToast('📋 Copied: ' + num, 'info');
    });

    return div;
  }

  window.renderDirectory = function () {
    const list = el('directoryList');
    if (!list) return;
    list.innerHTML = '';
    let members = HH.getDirectory(dirPage);

    // Filter
    if (dirSearch) {
      members = members.filter(m =>
        m.handle.toLowerCase().includes(dirSearch) ||
        m.emojiNumber.join('').includes(dirSearch)
      );
    }

    // Sort
    if (dirSort === 'name') {
      members.sort((a, b) => a.handle.localeCompare(b.handle));
    } else if (dirSort === 'online') {
      members.sort((a, b) => (b.online ? 1 : 0) - (a.online ? 1 : 0));
    }

    members.forEach(m => list.appendChild(buildDirEntry(m)));
    initScrollObserver();
  };

  // Search
  const dirSearchEl = el('dirSearch');
  if (dirSearchEl) {
    dirSearchEl.addEventListener('input', () => {
      dirSearch = dirSearchEl.value.trim().toLowerCase();
      window.renderDirectory();
    });
  }

  // Sort buttons
  document.querySelectorAll('.sort-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      dirSort = btn.dataset.sort;
      window.renderDirectory();
    });
  });

  // Load more
  const loadMoreBtn = el('loadMoreBtn');
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', () => {
      dirPage += 8;
      window.renderDirectory();
    });
  }

  /* ══════════════════════════════════════════════════════
     GALLERY
  ══════════════════════════════════════════════════════ */
  const GALLERY_ITEMS = [
    { emoji: '🌿', bg: 'linear-gradient(135deg,#0a2010,#1a3820)', title: 'Forest Signal Station', desc: 'Deep in the green, a relay node pulses.' },
    { emoji: '🛸', bg: 'linear-gradient(135deg,#0a0a20,#1a1040)', title: 'Orbital Transmission', desc: 'Hydrogen Host reaches beyond the stratosphere.' },
    { emoji: '🐴', bg: 'linear-gradient(135deg,#201000,#3a2010)', title: 'Meadow Network Node', desc: 'Where the horses run, the signal follows.' },
    { emoji: '🎷', bg: 'linear-gradient(135deg,#100a20,#201040)', title: 'Harmonic Frequency', desc: 'Classical waveforms encoded in emoji.' },
    { emoji: '🌻', bg: 'linear-gradient(135deg,#201500,#3a2800)', title: 'Solar Reception', desc: 'Sunflower arrays tuned to the signal grid.' },
    { emoji: '⚗️', bg: 'linear-gradient(135deg,#0a1020,#101830)', title: 'Hydrogen Lab', desc: 'Where the science of communication begins.' },
    { emoji: '🌊', bg: 'linear-gradient(135deg,#001020,#002040)', title: 'Deep Sea Relay', desc: 'Underwater nodes extend the network.' },
    { emoji: '🌙', bg: 'linear-gradient(135deg,#080814,#141428)', title: 'Night Transmission', desc: 'The network never sleeps.' },
    { emoji: '⚡', bg: 'linear-gradient(135deg,#101000,#202000)', title: 'Lightning Protocol', desc: 'Instant switching for real-time emoji calls.' },
  ];

  let lightboxIndex = 0;

  function openLightbox(index) {
    const lb = el('lightbox');
    const lbc = el('lightboxContent');
    if (!lb || !lbc) return;
    lightboxIndex = index;
    const item = GALLERY_ITEMS[index];
    lbc.innerHTML = `
      <span class="lightbox-emoji">${item.emoji}</span>
      <div class="lightbox-title">${escHtml(item.title)}</div>
      <div class="lightbox-desc">${escHtml(item.desc)}</div>
    `;
    lb.classList.remove('hidden');
    requestAnimationFrame(() => lb.classList.add('open'));
  }

  function closeLightbox() {
    const lb = el('lightbox');
    lb.classList.remove('open');
    setTimeout(() => lb.classList.add('hidden'), 300);
  }

  function initGallery() {
    const grid = el('galleryGrid');
    if (!grid) return;

    GALLERY_ITEMS.forEach((item, i) => {
      const div = document.createElement('div');
      div.className = 'gallery-item fade-in-up';
      div.innerHTML = `
        <div class="gallery-item-bg" style="background:${item.bg}">${item.emoji}</div>
        <div class="gallery-item-caption">${escHtml(item.title)}</div>
      `;
      div.addEventListener('click', () => openLightbox(i));
      grid.appendChild(div);
    });

    const lbClose = el('lightboxClose');
    const lbPrev  = el('lightboxPrev');
    const lbNext  = el('lightboxNext');
    const lb      = el('lightbox');

    if (lbClose) lbClose.addEventListener('click', closeLightbox);
    if (lb) lb.addEventListener('click', (e) => { if (e.target === lb) closeLightbox(); });
    if (lbPrev) {
      lbPrev.addEventListener('click', () => {
        openLightbox((lightboxIndex - 1 + GALLERY_ITEMS.length) % GALLERY_ITEMS.length);
      });
    }
    if (lbNext) {
      lbNext.addEventListener('click', () => {
        openLightbox((lightboxIndex + 1) % GALLERY_ITEMS.length);
      });
    }
    document.addEventListener('keydown', (e) => {
      if (!lb || lb.classList.contains('hidden')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft')  lbPrev && lbPrev.click();
      if (e.key === 'ArrowRight') lbNext && lbNext.click();
    });
  }

  /* ══════════════════════════════════════════════════════
     VIDEOS
  ══════════════════════════════════════════════════════ */
  const VIDEO_DATA = [
    { emoji: '📡', title: 'Setting Up Your Signal Node', duration: '8 min', views: '1.8K' },
    { emoji: '🌿', title: 'Nature & the Hydrogen Network', duration: '15 min', views: '3.1K' },
    { emoji: '🎹', title: 'Classical Frequencies Decoded', duration: '22 min', views: '5.7K' },
    { emoji: '🐴', title: 'Field Test: Meadow Relay Node', duration: '6 min', views: '920' },
    { emoji: '🛸', title: 'Orbital Transmission Demo', duration: '11 min', views: '2.4K' },
    { emoji: '⚙️', title: 'Building a Gallium Diode Array', duration: '18 min', views: '4.0K' },
  ];

  function initVideos() {
    const grid = el('videoGrid');
    if (!grid) return;

    VIDEO_DATA.forEach(v => {
      const div = document.createElement('div');
      div.className = 'video-card fade-in-up';
      div.innerHTML = `
        <div class="video-card-thumb" style="background:linear-gradient(135deg,#0f1c2e,#1a1030)">
          ${v.emoji}
          <div class="video-card-play">
            <div class="video-card-play-icon">▶</div>
          </div>
        </div>
        <div class="video-card-body">
          <div class="video-card-title">${escHtml(v.title)}</div>
          <div class="video-card-meta">
            <span>🕑 ${v.duration}</span>
            <span>👁 ${v.views} views</span>
          </div>
        </div>
      `;
      div.addEventListener('click', () => {
        window.showToast('▶ Playing: ' + v.title, 'info');
      });
      grid.appendChild(div);
    });

    const playFeatured = el('playFeatured');
    const watchBtn     = el('watchFeaturedBtn');
    if (playFeatured) {
      playFeatured.parentElement.addEventListener('click', () => {
        window.showToast('▶ Playing: How the Emoji Phone System Works', 'info');
      });
    }
    if (watchBtn) {
      watchBtn.addEventListener('click', () => {
        window.showToast('▶ Playing: How the Emoji Phone System Works', 'info');
      });
    }
  }

  /* ══════════════════════════════════════════════════════
     SOCIAL FEED
  ══════════════════════════════════════════════════════ */
  const MIN_MS  = 60 * 1000;
  const HOUR_MS = 60 * MIN_MS;
  const DAY_MS  = 24 * HOUR_MS;

  const SOCIAL_POSTS = [
    { avatar: '🌿', name: 'GreenEngineer 🌻', time: new Date(Date.now() - 30 * MIN_MS).toISOString(),
      number: ['🛸','🟦','🌻','🟨','💃','⬜','🐴','🟩'],
      text: 'Just claimed my emoji number on the Time Machine network! Nature + signals = my life 🌲📡' },
    { avatar: '🛸', name: 'HydrogenPilot', time: new Date(Date.now() - 2 * HOUR_MS).toISOString(),
      number: ['😎','🟦','👌','🟥','🎷','🟨','♣️','⬜'],
      text: 'The signal generator is incredible. Running a 440 Hz sine wave through the Hydrogen Host backbone right now.' },
    { avatar: '🎼', name: 'ClassicalWaves', time: new Date(Date.now() - DAY_MS).toISOString(),
      number: ['🎵','🟪','🎹','⬜','🌙','🟦','🎺','🟩'],
      text: 'Bach encoded in emoji. Beethoven next. The Time Machine network makes classical music feel futuristic. 🎷' },
    { avatar: '🐴', name: 'HorseWhisperer', time: new Date(Date.now() - 2 * DAY_MS).toISOString(),
      number: ['🐴','🟩','🌻','⬜','🎸','🟨','🛸','🟦'],
      text: 'Field-tested the meadow relay node. The horses didn\'t mind one bit. Signal strength: 94% 🌿📡' },
  ];

  function initSocialFeed() {
    const feed = el('socialFeed');
    if (!feed) return;

    SOCIAL_POSTS.forEach(post => {
      const div = document.createElement('div');
      div.className = 'social-post fade-in-up';
      div.innerHTML = `
        <div class="social-post-header">
          <div class="social-post-avatar">${post.avatar}</div>
          <div>
            <div class="social-post-name">${escHtml(post.name)}</div>
            <div class="social-post-time">${relativeTime(post.time)}</div>
          </div>
          <div class="social-post-number">${post.number.slice(0,4).join('')}…</div>
        </div>
        <div class="social-post-text">${escHtml(post.text)}</div>
        <div class="social-post-actions">
          <button class="spost-action" data-action="like">❤️ <span class="like-count">${Math.floor(4 + Math.random()*30)}</span></button>
          <button class="spost-action" data-action="reply">💬 Reply</button>
          <button class="spost-action" data-action="dial">📞 Dial</button>
          <button class="spost-action" data-action="share">🔗 Share</button>
        </div>
      `;
      div.querySelectorAll('.spost-action').forEach(btn => {
        btn.addEventListener('click', () => {
          const action = btn.dataset.action;
          if (action === 'like') {
            const count = btn.querySelector('.like-count');
            if (count) count.textContent = +count.textContent + 1;
          } else if (action === 'dial') {
            HH.dial(post.number, post.name);
            window.showToast('📞 Calling ' + post.name + '…', 'success');
          } else if (action === 'share') {
            window.showToast('🔗 Share link copied!', 'info');
          } else if (action === 'reply') {
            window.showToast('💬 Reply posted!', 'success');
          }
        });
      });
      feed.appendChild(div);
    });
  }

  /* ══════════════════════════════════════════════════════
     DISCUSSIONS
  ══════════════════════════════════════════════════════ */
  const INITIAL_THREADS = [
    { avatar: '🌿', author: 'GreenEngineer 🌻', time: new Date(Date.now() - 3.6e6).toISOString(),
      tag: 'nature', title: 'Using solar panels to power your signal node 🌻',
      body: 'Has anyone tried running a relay node off-grid with solar? I have a meadow setup that\'s been stable for 3 weeks. Happy to share the schematics.',
      likes: 14, replies: [
        { avatar: '📡', author: 'EchoStation', text: 'Yes! I\'m running a 200W panel array. Works great during summer solstice.' },
        { avatar: '⚙️', author: 'FluxCapacitor42', text: 'What\'s your battery buffer size? I lose signal after 2 hours of clouds.' },
      ]},
    { avatar: '🎼', author: 'ClassicalWaves', time: new Date(Date.now() - 7.2e6).toISOString(),
      tag: 'signal', title: 'Why 440 Hz is the perfect carrier for emoji phone numbers',
      body: 'I\'ve been testing different carrier frequencies and 440 Hz (A4 note) shows consistently lower packet loss. Coincidence or physics? Let\'s discuss.',
      likes: 22, replies: [
        { avatar: '🛸', author: 'HydrogenPilot', text: 'Fascinating theory. The resonance with standard tuning makes me wonder about natural harmonic alignment.' },
      ]},
    { avatar: '🐴', author: 'HorseWhisperer', time: new Date(Date.now() - 86400000).toISOString(),
      tag: 'general', title: 'Best outdoor locations for strong signal? 🌿',
      body: 'Open fields beat forests for me, but I lose connection near water. Anyone else notice geographic patterns in the Hydrogen Host routing?',
      likes: 9, replies: [] },
    { avatar: '🛸', author: 'NebulaDreamer', time: new Date(Date.now() - 172800000).toISOString(),
      tag: 'numbers', title: 'My emoji number keeps changing — is this a bug?',
      body: 'I cleared my browser cache and my number changed. Is the number truly device-bound or browser-bound? Would love clarification.',
      likes: 7, replies: [
        { avatar: '⚙️', author: 'FluxCapacitor42', text: 'It\'s browser-storage bound in the current version. The Hydrogen Host integration will make it device-permanent.' },
      ]},
  ];

  let threadStore = [...INITIAL_THREADS];
  let activeTag = 'general';

  function buildThread(thread, index) {
    const div = document.createElement('div');
    div.className = 'thread-card fade-in-up';
    div.dataset.index = index;

    const repliesHtml = thread.replies.map(r => `
      <div class="reply-item">
        <div class="reply-avatar">${r.avatar}</div>
        <div class="reply-body">
          <div class="reply-author">${escHtml(r.author)}</div>
          <div class="reply-text">${escHtml(r.text)}</div>
        </div>
      </div>
    `).join('');

    div.innerHTML = `
      <div class="thread-header">
        <div class="thread-avatar">${thread.avatar}</div>
        <div class="thread-meta">
          <div class="thread-title">${escHtml(thread.title)}</div>
          <div class="thread-author">${escHtml(thread.author)} · ${relativeTime(thread.time)}</div>
        </div>
        <span class="thread-tag">${thread.tag}</span>
      </div>
      <div class="thread-body">${escHtml(thread.body)}</div>
      <div class="thread-footer">
        <button class="thread-action" data-action="like">
          ❤️ <span class="t-likes">${thread.likes}</span>
        </button>
        <button class="thread-action" data-action="reply-toggle">
          💬 ${thread.replies.length} ${thread.replies.length === 1 ? 'reply' : 'replies'}
        </button>
        <button class="thread-action" data-action="share">🔗 Share</button>
      </div>
      <div class="thread-replies" id="replies-${index}">
        ${repliesHtml}
        <div class="reply-compose">
          <input class="input reply-input" placeholder="Write a reply…" maxlength="200" />
          <button class="btn btn--primary btn--sm reply-submit-btn">Reply</button>
        </div>
      </div>
    `;

    // Like
    div.querySelector('[data-action="like"]').addEventListener('click', () => {
      const countEl = div.querySelector('.t-likes');
      thread.likes++;
      countEl.textContent = thread.likes;
    });

    // Toggle replies
    div.querySelector('[data-action="reply-toggle"]').addEventListener('click', () => {
      const repliesEl = el('replies-' + index);
      if (repliesEl) repliesEl.classList.toggle('open');
    });

    // Share
    div.querySelector('[data-action="share"]').addEventListener('click', () => {
      window.showToast('🔗 Thread link copied!', 'info');
    });

    // Submit reply
    const replyInput  = div.querySelector('.reply-input');
    const replySubmit = div.querySelector('.reply-submit-btn');
    replySubmit.addEventListener('click', () => {
      const text = replyInput.value.trim();
      if (!text) return;
      const session = HH.getSession();
      const replyEl = document.createElement('div');
      replyEl.className = 'reply-item';
      replyEl.innerHTML = `
        <div class="reply-avatar">${session ? session.avatar : '😎'}</div>
        <div class="reply-body">
          <div class="reply-author">${escHtml(session ? session.handle : 'You')}</div>
          <div class="reply-text">${escHtml(text)}</div>
        </div>
      `;
      const repliesEl = el('replies-' + index);
      repliesEl.insertBefore(replyEl, div.querySelector('.reply-compose'));
      repliesEl.classList.add('open');
      replyInput.value = '';
      // Update reply count label
      const replyToggle = div.querySelector('[data-action="reply-toggle"]');
      thread.replies.push({ avatar: session ? session.avatar : '😎', author: session ? session.handle : 'You', text });
      replyToggle.textContent = '💬 ' + thread.replies.length + (thread.replies.length === 1 ? ' reply' : ' replies');
      window.showToast('💬 Reply posted!', 'success');
    });

    return div;
  }

  window.renderThreads = function () {
    const container = el('discussThreads');
    if (!container) return;
    container.innerHTML = '';
    threadStore.forEach((t, i) => container.appendChild(buildThread(t, i)));
    initScrollObserver();
  };

  // Post new discussion
  const postBtn = el('postDiscussBtn');
  if (postBtn) {
    postBtn.addEventListener('click', () => {
      const title = el('discussTitle').value.trim();
      const body  = el('discussBody').value.trim();
      if (!title) { window.showToast('Please add a title 👆', 'warn'); return; }
      const session = HH.getSession();
      const thread = {
        avatar: session ? session.avatar : '😎',
        author: session ? session.handle : 'Anonymous',
        time:   new Date().toISOString(),
        tag:    activeTag,
        title,
        body:   body || '',
        likes:  0,
        replies: [],
      };
      threadStore.unshift(thread);
      window.renderThreads();
      el('discussTitle').value = '';
      el('discussBody').value  = '';

      // Update compose avatar
      const composeAvatar = el('composeAvatar');
      if (composeAvatar && session) composeAvatar.textContent = session.avatar;

      window.showToast('📨 Post published!', 'success');
    });
  }

  // Tag buttons
  document.querySelectorAll('.tag-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tag-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeTag = btn.dataset.tag;
    });
  });

  // Load more threads
  const loadMoreThreads = el('loadMoreThreads');
  if (loadMoreThreads) {
    loadMoreThreads.addEventListener('click', () => {
      window.showToast('Loading more discussions…', 'info');
    });
  }

  /* ══════════════════════════════════════════════════════
     BOOT
  ══════════════════════════════════════════════════════ */
  document.addEventListener('DOMContentLoaded', () => {
    window.renderDirectory();
    initGallery();
    initVideos();
    initSocialFeed();
    window.renderThreads();
    initScrollObserver();
  });
})();
