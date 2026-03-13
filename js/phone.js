/**
 * phone.js
 * Emoji phone number UI — register display, re-roll, claim, copy, share.
 * Depends on: window.HH (hydrogen-host.js)
 */

(function () {
  'use strict';

  let currentNumber = []; // the number currently shown in the UI

  /* ── DOM refs ────────────────────────────────────────── */
  const emojiRow        = document.getElementById('emojiRow');
  const registerLabel   = document.getElementById('registerLabel');
  const registerForm    = document.getElementById('registerForm');
  const registerClaimed = document.getElementById('registerClaimed');
  const claimBtn        = document.getElementById('claimBtn');
  const rerollBtn       = document.getElementById('rerollBtn');
  const copyNumberBtn   = document.getElementById('copyNumberBtn');
  const shareBtn        = document.getElementById('shareBtn');
  const userHandle      = document.getElementById('userHandle');
  const userBio         = document.getElementById('userBio');
  const heroSampleNum   = document.getElementById('heroSampleNumber');
  const composeAvatar   = document.getElementById('composeAvatar');
  const socialMyNumber  = document.getElementById('socialMyNumber');
  const socialCopyBtn   = document.getElementById('socialCopyBtn');

  /* ── Render emoji row ────────────────────────────────── */
  function renderNumber(arr, targetEl) {
    const el = targetEl || emojiRow;
    el.innerHTML = '';
    arr.forEach((em, i) => {
      const span = document.createElement('span');
      span.className = 'emoji-block';
      span.textContent = em;
      span.title = 'Block ' + (i + 1);
      el.appendChild(span);
    });
  }

  /* ── Animate in a new number ─────────────────────────── */
  function animateNumber(arr) {
    emojiRow.innerHTML = '';
    arr.forEach((em, i) => {
      const span = document.createElement('span');
      span.className = 'emoji-block';
      span.textContent = '⏳';
      span.style.opacity = '0';
      emojiRow.appendChild(span);
      setTimeout(() => {
        span.textContent = em;
        span.style.transition = 'opacity 0.3s, transform 0.3s';
        span.style.opacity = '1';
        span.style.transform = 'scale(1.2)';
        setTimeout(() => { span.style.transform = 'scale(1)'; }, 200);
      }, i * 80);
    });
  }

  /* ── Initialise ──────────────────────────────────────── */
  function init() {
    currentNumber = HH.getMyNumber();

    // Check if already registered
    const session = HH.getSession();
    if (session) {
      currentNumber = session.emojiNumber;
      renderNumber(currentNumber);
      registerLabel.textContent = HH.formatNumber(currentNumber);
      showClaimed(session);
      updateSocialNumber(currentNumber);
      updateComposeAvatar(session);
    } else {
      animateNumber(currentNumber);
      registerLabel.textContent = 'Your unique device identifier — claim it below';
    }

    // Hero sample number decorative blocks animate on load
    // (already set in HTML, just add stagger via CSS custom property)
    if (heroSampleNum) {
      [...heroSampleNum.children].forEach((el, i) => {
        el.style.setProperty('--i', i);
      });
    }
  }

  function showClaimed(session) {
    registerForm.classList.add('hidden');
    registerClaimed.classList.remove('hidden');
    updateComposeAvatar(session);
  }

  function updateComposeAvatar(session) {
    if (composeAvatar && session) {
      composeAvatar.textContent = session.avatar || session.emojiNumber[0];
    }
  }

  function updateSocialNumber(arr) {
    if (socialMyNumber) {
      socialMyNumber.textContent = HH.formatNumber(arr);
    }
  }

  /* ── Claim button ────────────────────────────────────── */
  if (claimBtn) {
    claimBtn.addEventListener('click', () => {
      const handle = userHandle.value.trim() || 'Anonymous';
      const bio    = userBio.value.trim();
      const result = HH.register(currentNumber, handle, bio);
      if (result.ok) {
        showClaimed(result.session);
        updateSocialNumber(currentNumber);
        window.showToast('✅ Number claimed! Welcome to the network.', 'success');
        // Refresh directory
        if (typeof window.renderDirectory === 'function') window.renderDirectory();
      }
    });
  }

  /* ── Re-roll button ──────────────────────────────────── */
  if (rerollBtn) {
    rerollBtn.addEventListener('click', () => {
      currentNumber = HH.randomNumber();
      animateNumber(currentNumber);
      registerLabel.textContent = 'Generated a new number — claim it above';
    });
  }

  /* ── Copy button ─────────────────────────────────────── */
  function copyNumber() {
    const text = HH.formatNumber(currentNumber);
    navigator.clipboard.writeText(text).then(() => {
      window.showToast('📋 Copied: ' + text, 'info');
    }).catch(() => {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      window.showToast('📋 Copied!', 'info');
    });
  }

  if (copyNumberBtn) copyNumberBtn.addEventListener('click', copyNumber);
  if (socialCopyBtn) socialCopyBtn.addEventListener('click', copyNumber);

  /* ── Share button ────────────────────────────────────── */
  if (shareBtn) {
    shareBtn.addEventListener('click', () => {
      const text = 'My Time Machine emoji number: ' + HH.formatNumber(currentNumber) +
                   ' — get yours at ' + window.location.href;
      if (navigator.share) {
        navigator.share({ title: 'My Emoji Number', text }).catch(() => {});
      } else {
        navigator.clipboard.writeText(text).then(() => {
          window.showToast('🔗 Share text copied!', 'info');
        });
      }
    });
  }

  /* ── Boot ────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', init);

  /* ── Expose helper for dial buttons ─────────────────── */
  window.PhoneUI = { renderNumber };
})();
