// Next.js App Router GET handler for on-demand image optimization.
//
// Usage — one file, zero config:
//
//   // app/api/image/route.ts
//   export { GET } from '@think-grid-labs/snapbolt-cli/handler';
//
// Then set serverUrl="/api/image" in <SnapboltProvider> (or use the default).
//
// Environment variables (all optional):
//   SNAPBOLT_ALLOWED_DOMAINS  Comma-separated host allowlist for SSRF protection.
//                             Example: "example.com,cdn.example.com"
//                             When unset, all domains are allowed (dev only).

'use strict';

// createRequire(__filename) makes the native addon load opaque to webpack/Turbopack.
// Static analyzers only trace the global require() — calls through a createRequire
// result are treated as runtime-only and never bundled.
const { createRequire } = require('node:module');
const nodeRequire = createRequire(__filename);

// Lazy singleton — load the native addon once per process, not per request
let _optimizeImage = null;
function getOptimizeImage() {
  if (!_optimizeImage) _optimizeImage = nodeRequire('./index.js').optimizeImage;
  return _optimizeImage;
}

const ALLOWED_DOMAINS = (process.env.SNAPBOLT_ALLOWED_DOMAINS ?? '')
  .split(',')
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean);

function isDomainAllowed(host) {
  if (ALLOWED_DOMAINS.length === 0) return true;
  const h = host.toLowerCase();
  return ALLOWED_DOMAINS.some((d) => h === d || h.endsWith('.' + d));
}

function resolveFormat(fmtParam) {
  if (fmtParam && fmtParam !== 'auto') return fmtParam;
  return 'webp';
}

const MIME = {
  webp: 'image/webp',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
};

async function GET(request) {
  const { NextResponse } = await import('next/server');
  const { searchParams } = new URL(request.url);

  const url = searchParams.get('url');
  if (!url) {
    return NextResponse.json({ error: 'url is required' }, { status: 400 });
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  if (!isDomainAllowed(parsed.hostname)) {
    return NextResponse.json(
      { error: 'Domain not in SNAPBOLT_ALLOWED_DOMAINS' },
      { status: 403 }
    );
  }

  const w = searchParams.get('w') ? parseInt(searchParams.get('w'), 10) : undefined;
  const h = searchParams.get('h') ? parseInt(searchParams.get('h'), 10) : undefined;
  const q = searchParams.get('q') ? parseInt(searchParams.get('q'), 10) : 80;
  const fmt = resolveFormat(searchParams.get('fmt'));

  // Fetch the upstream image
  let upstream;
  try {
    upstream = await fetch(url);
    if (!upstream.ok) throw new Error(`HTTP ${upstream.status}`);
  } catch (e) {
    return NextResponse.json({ error: `Failed to fetch: ${e.message}` }, { status: 502 });
  }

  const bytes = Buffer.from(await upstream.arrayBuffer());

  // Optimize — pure Rust via NAPI, loaded at runtime (not bundled)
  let optimized;
  try {
    optimized = getOptimizeImage()(bytes, q, w, h, fmt);
  } catch (e) {
    return NextResponse.json({ error: `Optimization failed: ${e.message}` }, { status: 422 });
  }

  return new NextResponse(optimized, {
    headers: {
      'Content-Type': MIME[fmt] ?? 'image/webp',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Powered-By': 'snapbolt',
    },
  });
}

module.exports = { GET };
