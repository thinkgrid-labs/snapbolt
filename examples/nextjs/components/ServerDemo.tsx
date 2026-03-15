'use client';

import { useState } from 'react';
import styles from './ServerDemo.module.css';

interface ServerDemoProps {
  src: string;
}

const WIDTHS = [400, 800, 1200];
const QUALITIES = [40, 75, 90];
const FORMATS = ['webp', 'jpeg', 'png'] as const;

type Format = (typeof FORMATS)[number];

const SERVER_URL = process.env.NEXT_PUBLIC_SNAPBOLT_SERVER_URL ?? 'http://localhost:3000';

function buildUrl(src: string, width: number, quality: number, fmt: Format): string {
  const params = new URLSearchParams({
    url: src,
    w: String(width),
    q: String(quality),
    fmt,
  });
  return `${SERVER_URL}/image?${params.toString()}`;
}

export default function ServerDemo({ src }: ServerDemoProps) {
  const [width, setWidth] = useState(800);
  const [quality, setQuality] = useState(75);
  const [fmt, setFmt] = useState<Format>('webp');
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [responseSize, setResponseSize] = useState<number | null>(null);

  const requestUrl = buildUrl(src, width, quality, fmt);

  const fetch_ = async () => {
    setLoading(true);
    setError(null);
    setImgSrc(null);
    setResponseSize(null);

    try {
      const resp = await fetch(requestUrl);
      if (!resp.ok) {
        const body = await resp.text();
        throw new Error(`${resp.status} — ${body}`);
      }
      const buf = await resp.arrayBuffer();
      setResponseSize(buf.byteLength);
      const blob = new Blob([buf], { type: resp.headers.get('Content-Type') ?? 'image/webp' });
      setImgSrc(URL.createObjectURL(blob));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <p className={styles.note}>
        This is what <code>&lt;SmartImage priority /&gt;</code> does
        automatically — it builds this URL, generates a full{' '}
        <code>srcset</code> at 640w / 1080w / 1920w, and injects a{' '}
        <code>&lt;link rel=&quot;preload&quot;&gt;</code> into{' '}
        <code>&lt;head&gt;</code>. Hit the same params twice to see{' '}
        <code>X-Cache: HIT</code>.
      </p>

      {/* Controls */}
      <div className={styles.controls}>
        <label className={styles.control}>
          <span>Width</span>
          <select value={width} onChange={(e) => setWidth(Number(e.target.value))}>
            {WIDTHS.map((w) => (
              <option key={w} value={w}>{w}px</option>
            ))}
          </select>
        </label>

        <label className={styles.control}>
          <span>Quality</span>
          <select value={quality} onChange={(e) => setQuality(Number(e.target.value))}>
            {QUALITIES.map((q) => (
              <option key={q} value={q}>{q}</option>
            ))}
          </select>
        </label>

        <label className={styles.control}>
          <span>Format</span>
          <select value={fmt} onChange={(e) => setFmt(e.target.value as Format)}>
            {FORMATS.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </label>

        <button onClick={fetch_} disabled={loading} className={styles.btn}>
          {loading ? 'Fetching…' : 'Request Image'}
        </button>
      </div>

      {/* URL preview */}
      <div className={styles.urlBar}>
        <code>{requestUrl}</code>
      </div>

      {/* Result */}
      {error && <p className={styles.error}>{error}</p>}

      {imgSrc && (
        <div className={styles.result}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imgSrc} alt="Server-optimized" className={styles.image} />
          <div className={styles.meta}>
            Received <strong>{responseSize ? `${(responseSize / 1024).toFixed(1)} KB` : '—'}</strong>
            {' '}as <strong>{fmt}</strong>
          </div>
        </div>
      )}
    </div>
  );
}
