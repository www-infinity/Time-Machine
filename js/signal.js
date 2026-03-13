/**
 * signal.js
 * Signal generator — canvas waveform visualizer + Web Audio API transmitter.
 * Depends on: window.HH (hydrogen-host.js)
 */

(function () {
  'use strict';

  /* ── State ───────────────────────────────────────────── */
  let waveType   = 'sine';
  let frequency  = 440;
  let amplitude  = 0.7;
  let modulation = 0;
  let isTransmitting = false;
  let audioCtx   = null;
  let oscillator = null;
  let gainNode   = null;
  let modOsc     = null;
  let animFrame  = null;
  let phase      = 0;

  /* ── DOM refs ────────────────────────────────────────── */
  const waveCanvas    = document.getElementById('waveCanvas');
  const freqReadout   = document.getElementById('freqReadout');
  const signalStatus  = document.getElementById('signalStatus');
  const freqSlider    = document.getElementById('freqSlider');
  const ampSlider     = document.getElementById('ampSlider');
  const modSlider     = document.getElementById('modSlider');
  const freqValue     = document.getElementById('freqValue');
  const ampValue      = document.getElementById('ampValue');
  const modValue      = document.getElementById('modValue');
  const transmitBtn   = document.getElementById('transmitBtn');
  const stopBtn       = document.getElementById('stopBtn');
  const scanBtn       = document.getElementById('scanBtn');
  const waveSelector  = document.getElementById('waveSelector');
  const scanResult    = document.getElementById('scanResult');
  const scanList      = document.getElementById('scanList');

  if (!waveCanvas) return; // page not loaded yet

  const ctx = waveCanvas.getContext('2d');

  /* ── Canvas resize ───────────────────────────────────── */
  function resizeCanvas() {
    const rect = waveCanvas.parentElement.getBoundingClientRect();
    waveCanvas.width  = rect.width  || 800;
    waveCanvas.height = rect.height || 280;
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  /* ── Draw waveform ───────────────────────────────────── */
  function getSampleValue(x, width) {
    const t = x / width;
    const cycles = frequency / 40; // cycles per canvas width (visual)
    const angle = t * cycles * Math.PI * 2 + phase;
    const mod_t = modulation > 0 ? 1 + (modulation / 100) * Math.sin(angle * 3.7) : 1;

    switch (waveType) {
      case 'sine':
        return Math.sin(angle) * mod_t;
      case 'square':
        return (Math.sin(angle) >= 0 ? 1 : -1) * mod_t;
      case 'sawtooth':
        return ((angle % (Math.PI * 2)) / (Math.PI * 2) * 2 - 1) * mod_t;
      case 'triangle': {
        const norm = ((angle % (Math.PI * 2)) / (Math.PI * 2));
        return (norm < 0.5 ? norm * 4 - 1 : 3 - norm * 4) * mod_t;
      }
      default:
        return Math.sin(angle) * mod_t;
    }
  }

  function drawWave() {
    const W = waveCanvas.width;
    const H = waveCanvas.height;
    const midY = H / 2;
    const amp = amplitude * (H / 2 - 24);

    ctx.clearRect(0, 0, W, H);

    // Background grid
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for (let gx = 0; gx < W; gx += 80) {
      ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
    }
    for (let gy = 0; gy < H; gy += 50) {
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
    }

    // Center line
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, midY); ctx.lineTo(W, midY); ctx.stroke();

    // Glow layer (wide, low opacity)
    ctx.save();
    ctx.strokeStyle = isTransmitting
      ? 'rgba(0,212,255,0.15)'
      : 'rgba(0,212,255,0.06)';
    ctx.lineWidth = 10;
    ctx.shadowColor = '#00d4ff';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 2) {
      const y = midY - getSampleValue(x, W) * amp;
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();

    // Main wave
    const grad = ctx.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0,   '#00d4ff');
    grad.addColorStop(0.5, '#7c3aed');
    grad.addColorStop(1,   '#00d4ff');
    ctx.strokeStyle = grad;
    ctx.lineWidth = isTransmitting ? 2.5 : 1.5;
    ctx.shadowColor = '#00d4ff';
    ctx.shadowBlur = isTransmitting ? 12 : 4;
    ctx.beginPath();
    for (let x = 0; x <= W; x++) {
      const y = midY - getSampleValue(x, W) * amp;
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Advance phase
    if (isTransmitting) {
      phase += (frequency / 2000) * 0.3;
    } else {
      phase += 0.006;
    }

    animFrame = requestAnimationFrame(drawWave);
  }

  /* ── Controls ────────────────────────────────────────── */
  if (freqSlider) {
    freqSlider.addEventListener('input', () => {
      frequency = +freqSlider.value;
      freqValue.textContent = frequency;
      freqReadout.textContent = frequency + ' Hz';
    });
  }
  if (ampSlider) {
    ampSlider.addEventListener('input', () => {
      amplitude = ampSlider.value / 100;
      ampValue.textContent = ampSlider.value;
      if (gainNode) gainNode.gain.setTargetAtTime(amplitude * 0.3, audioCtx.currentTime, 0.01);
    });
  }
  if (modSlider) {
    modSlider.addEventListener('input', () => {
      modulation = +modSlider.value;
      modValue.textContent = modulation;
    });
  }
  if (waveSelector) {
    waveSelector.querySelectorAll('.wave-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        waveSelector.querySelectorAll('.wave-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        waveType = btn.dataset.wave;
        if (oscillator) {
          oscillator.type = waveType;
        }
      });
    });
  }

  /* ── Web Audio ───────────────────────────────────────── */
  function startAudio() {
    audioCtx  = new (window.AudioContext || window.webkitAudioContext)();
    gainNode  = audioCtx.createGain();
    gainNode.gain.setValueAtTime(amplitude * 0.3, audioCtx.currentTime);
    gainNode.connect(audioCtx.destination);

    oscillator = audioCtx.createOscillator();
    oscillator.type      = waveType;
    oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);
    oscillator.connect(gainNode);
    oscillator.start();

    if (modulation > 0) {
      modOsc = audioCtx.createOscillator();
      const modGain = audioCtx.createGain();
      modGain.gain.setValueAtTime(modulation * 2, audioCtx.currentTime);
      modOsc.frequency.setValueAtTime(modulation / 10, audioCtx.currentTime);
      modOsc.connect(modGain);
      modGain.connect(oscillator.frequency);
      modOsc.start();
    }
  }

  function stopAudio() {
    if (oscillator) { try { oscillator.stop(); } catch (_) {} oscillator = null; }
    if (modOsc)     { try { modOsc.stop();     } catch (_) {} modOsc = null; }
    if (gainNode)   { gainNode.disconnect(); gainNode = null; }
    if (audioCtx)   { audioCtx.close();     audioCtx = null; }
  }

  /* ── Transmit / Stop ─────────────────────────────────── */
  if (transmitBtn) {
    transmitBtn.addEventListener('click', () => {
      isTransmitting = true;
      transmitBtn.classList.add('hidden');
      stopBtn.classList.remove('hidden');
      signalStatus.textContent = '● TRANSMITTING';
      signalStatus.classList.add('transmitting');
      try { startAudio(); } catch (_) {}
      window.showToast('📡 Transmitting at ' + frequency + ' Hz', 'info');
    });
  }
  if (stopBtn) {
    stopBtn.addEventListener('click', () => {
      isTransmitting = false;
      stopBtn.classList.add('hidden');
      transmitBtn.classList.remove('hidden');
      signalStatus.textContent = '● READY';
      signalStatus.classList.remove('transmitting');
      stopAudio();
      window.showToast('⏹ Signal stopped', 'warn');
    });
  }

  /* ── Scan ────────────────────────────────────────────── */
  if (scanBtn) {
    scanBtn.addEventListener('click', () => {
      scanBtn.disabled = true;
      scanBtn.innerHTML = '<span class="btn-icon">🔄</span> Scanning…';
      scanList.innerHTML = '';

      setTimeout(() => {
        const found = HH.scan();
        scanResult.classList.remove('hidden');
        scanList.innerHTML = '';

        found.forEach(user => {
          const item = document.createElement('div');
          item.className = 'scan-item';
          item.innerHTML = `
            <span>${user.avatar || user.emojiNumber[0]}</span>
            <span class="scan-item-number">${user.handle}</span>
            <span style="font-size:0.85rem">${user.emojiNumber.slice(0,4).join('')}…</span>
            <span class="scan-item-signal">▲ ${user.signalStrength}%</span>
          `;
          item.addEventListener('click', () => {
            const result = HH.dial(user.emojiNumber, user.handle);
            window.showToast('📞 Calling ' + user.handle + '…', 'success');
            console.info('[Signal] Dial result:', result);
          });
          scanList.appendChild(item);
        });

        scanBtn.disabled = false;
        scanBtn.innerHTML = '<span class="btn-icon">🔍</span> Scan Again';
        window.showToast('🔍 Found ' + found.length + ' devices in range', 'info');
      }, 1200);
    });
  }

  /* ── Boot ────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', () => {
    resizeCanvas();
    drawWave();
  });
})();
