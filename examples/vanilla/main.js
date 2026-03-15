/**
 * Snapbolt Vanilla JS Example
 *
 * Uses the browser WASM API directly — no React, no bundler.
 * The WASM module is lazy-initialized once on first use.
 */

import init, { optimize_image_sync } from '@think-grid-labs/snapbolt/browser';

// ─── WASM init ────────────────────────────────────────────────────────────────

let wasmReady = false;

async function ensureWasm() {
  if (wasmReady) return;
  // Path to the .wasm file relative to index.html
  await init('./snapbolt_bg.wasm');
  wasmReady = true;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(2)} MB`;
}

function savings(orig, opt) {
  const pct = Math.round((1 - opt / orig) * 100);
  return pct > 0 ? `<span class="badge">${pct}% smaller</span>` : '';
}

function showEl(...els) { els.forEach((e) => e?.classList.remove('hidden')); }
function hideEl(...els) { els.forEach((e) => e?.classList.add('hidden')); }
function setError(el, msg) {
  el.textContent = msg;
  showEl(el);
}
function clearError(el) { hideEl(el); el.textContent = ''; }

/**
 * Core optimization function — shared by all three demo tabs.
 * @param {Uint8Array} inputBytes - Raw image bytes
 * @param {number} quality - 1–100
 * @param {number} [maxWidth] - Resize to this width (0 = no resize)
 * @returns {Promise<{ blob: Blob, bytes: Uint8Array }>}
 */
async function optimizeBytes(inputBytes, quality, maxWidth = 0) {
  await ensureWasm();

  let bytes = inputBytes;

  // If resize requested, do a canvas pass first (browser-native, free)
  if (maxWidth > 0) {
    bytes = await resizeViaCanvas(inputBytes, maxWidth);
  }

  const optimized = optimize_image_sync(bytes, quality);
  const blob = new Blob([optimized], { type: 'image/webp' });
  return { blob, bytes: optimized };
}

/** Canvas-based resize to maxWidth, preserving aspect ratio. */
async function resizeViaCanvas(inputBytes, maxWidth) {
  return new Promise((resolve, reject) => {
    const blob = new Blob([inputBytes]);
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.src = url;
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      canvas.toBlob((b) => {
        if (!b) { reject(new Error('Canvas toBlob failed')); return; }
        b.arrayBuffer().then((buf) => resolve(new Uint8Array(buf)));
      }, 'image/png');
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')); };
  });
}

// ─── Tab switching ────────────────────────────────────────────────────────────

document.querySelectorAll('.tab').forEach((btn) => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.tab;
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.add('hidden'));
    btn.classList.add('active');
    document.getElementById(`tab-${target}`).classList.remove('hidden');
  });
});

// ─── Tab 1: File Upload ───────────────────────────────────────────────────────

const fileInput    = document.getElementById('fileInput');
const fileLabel    = document.getElementById('fileLabel');
const fileQuality  = document.getElementById('fileQuality');
const fileQualVal  = document.getElementById('fileQualityVal');
const fileWidth    = document.getElementById('fileWidth');
const fileCompar   = document.getElementById('fileComparison');
const fileOrigImg  = document.getElementById('fileOrigImg');
const fileOptImg   = document.getElementById('fileOptImg');
const fileOrigSize = document.getElementById('fileOrigSize');
const fileOptSize  = document.getElementById('fileOptSize');
const fileSkeleton = document.getElementById('fileSkeleton');
const fileActions  = document.getElementById('fileActions');
const fileDownload = document.getElementById('fileDownload');
const fileError    = document.getElementById('fileError');

fileQuality.addEventListener('input', () => { fileQualVal.value = fileQuality.value; });

fileInput.addEventListener('change', async () => {
  const file = fileInput.files?.[0];
  if (!file) return;

  fileLabel.textContent = file.name;
  clearError(fileError);
  hideEl(fileActions);
  showEl(fileCompar);

  // Show original
  const origUrl = URL.createObjectURL(file);
  fileOrigImg.src = origUrl;
  fileOrigSize.textContent = fmt(file.size);

  // Show skeleton while processing
  showEl(fileSkeleton);
  hideEl(fileOptImg);
  fileOptSize.innerHTML = '';

  const inputBytes = new Uint8Array(await file.arrayBuffer());
  const quality    = Number(fileQuality.value);
  const maxWidth   = Number(fileWidth.value) || 0;

  try {
    const { blob } = await optimizeBytes(inputBytes, quality, maxWidth);
    const optUrl = URL.createObjectURL(blob);

    fileOptImg.src = optUrl;
    hideEl(fileSkeleton);
    showEl(fileOptImg);
    fileOptSize.innerHTML = fmt(blob.size) + ' ' + savings(file.size, blob.size);

    // Wire up download link
    fileDownload.href = optUrl;
    showEl(fileActions);
  } catch (err) {
    hideEl(fileSkeleton);
    setError(fileError, `Optimization failed: ${err.message}`);
  }
});

// ─── Tab 2: Remote URL ────────────────────────────────────────────────────────

const urlInput    = document.getElementById('urlInput');
const urlQuality  = document.getElementById('urlQuality');
const urlQualVal  = document.getElementById('urlQualityVal');
const urlWidth    = document.getElementById('urlWidth');
const urlOptBtn   = document.getElementById('urlOptimizeBtn');
const urlCompar   = document.getElementById('urlComparison');
const urlOrigImg  = document.getElementById('urlOrigImg');
const urlOptImg   = document.getElementById('urlOptImg');
const urlOrigSize = document.getElementById('urlOrigSize');
const urlOptSize  = document.getElementById('urlOptSize');
const urlSkeleton = document.getElementById('urlSkeleton');
const urlError    = document.getElementById('urlError');

urlQuality.addEventListener('input', () => { urlQualVal.value = urlQuality.value; });

urlOptBtn.addEventListener('click', async () => {
  const url = urlInput.value.trim();
  if (!url) return;

  clearError(urlError);
  showEl(urlCompar);
  hideEl(urlOptImg);
  urlOrigSize.textContent = '';
  urlOptSize.innerHTML = '';

  // Show original
  urlOrigImg.src = url;

  showEl(urlSkeleton);
  urlOptBtn.disabled = true;

  try {
    const resp = await fetch(url, { mode: 'cors' });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const buf        = await resp.arrayBuffer();
    const origBytes  = new Uint8Array(buf);
    urlOrigSize.textContent = fmt(origBytes.byteLength);

    const quality  = Number(urlQuality.value);
    const maxWidth = Number(urlWidth.value) || 0;

    const { blob } = await optimizeBytes(origBytes, quality, maxWidth);
    const optUrl = URL.createObjectURL(blob);

    urlOptImg.src = optUrl;
    hideEl(urlSkeleton);
    showEl(urlOptImg);
    urlOptSize.innerHTML = fmt(blob.size) + ' ' + savings(origBytes.byteLength, blob.size);
  } catch (err) {
    hideEl(urlSkeleton);
    setError(urlError, `Failed: ${err.message}. Check CORS headers on the remote server.`);
  } finally {
    urlOptBtn.disabled = false;
  }
});

// ─── Tab 3: snapbolt-server ───────────────────────────────────────────────────

const serverBase     = document.getElementById('serverBase');
const serverImg      = document.getElementById('serverImg');
const serverWidth    = document.getElementById('serverWidth');
const serverQuality  = document.getElementById('serverQuality');
const serverQualVal  = document.getElementById('serverQualityVal');
const serverFmt      = document.getElementById('serverFmt');
const serverFetchBtn = document.getElementById('serverFetchBtn');
const serverUrlDisp  = document.getElementById('serverUrlDisplay');
const serverUrlText  = document.getElementById('serverUrlText');
const serverResult   = document.getElementById('serverResult');
const serverResultImg  = document.getElementById('serverResultImg');
const serverResultSize = document.getElementById('serverResultSize');
const serverError    = document.getElementById('serverError');

serverQuality.addEventListener('input', () => { serverQualVal.value = serverQuality.value; });

serverFetchBtn.addEventListener('click', async () => {
  const base    = serverBase.value.replace(/\/$/, '');
  const imgUrl  = serverImg.value.trim();
  const width   = serverWidth.value;
  const quality = serverQuality.value;
  const fmt_    = serverFmt.value;

  if (!imgUrl) return;

  clearError(serverError);
  hideEl(serverResult);

  const params = new URLSearchParams({ url: imgUrl, w: width, q: quality, fmt: fmt_ });
  const requestUrl = `${base}/image?${params}`;

  serverUrlText.textContent = requestUrl;
  showEl(serverUrlDisp);

  serverFetchBtn.disabled = true;
  serverFetchBtn.textContent = 'Fetching…';

  try {
    const resp = await fetch(requestUrl);
    if (!resp.ok) {
      const body = await resp.text();
      throw new Error(`${resp.status} — ${body}`);
    }

    const buf  = await resp.arrayBuffer();
    const mime = resp.headers.get('Content-Type') ?? 'image/webp';
    const blob = new Blob([buf], { type: mime });

    serverResultImg.src = URL.createObjectURL(blob);
    serverResultSize.innerHTML =
      `${fmt(buf.byteLength)} · ${mime} · ` +
      `<span class="cache-tag ${resp.headers.get('X-Cache') === 'HIT' ? 'hit' : 'miss'}">` +
      `X-Cache: ${resp.headers.get('X-Cache') ?? '—'}</span>`;

    showEl(serverResult);
  } catch (err) {
    setError(serverError, `${err.message}. Is snapbolt-server running?`);
  } finally {
    serverFetchBtn.disabled = false;
    serverFetchBtn.textContent = 'Fetch from Server';
  }
});
