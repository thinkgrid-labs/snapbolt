'use client';

import { useImageOptimizer } from '@think-grid-labs/snapbolt';
import { useState } from 'react';
import styles from './SmartImage.module.css';

interface SmartImageProps {
  src: string;
  width?: number;
  quality?: number;
  alt?: string;
}

/**
 * Wraps useImageOptimizer to show a before/after comparison with file size stats.
 * In production you'd drop the stats panel and just use the optimizedUrl directly.
 */
export default function SmartImage({
  src,
  width = 800,
  quality = 75,
  alt = '',
}: SmartImageProps) {
  const { optimizedUrl, loading, error } = useImageOptimizer(src, {
    quality,
    width,
    // wasmUrl: '/snapbolt_bg.wasm' — set this if the default path doesn't work
  });

  const [originalSize, setOriginalSize] = useState<number | null>(null);
  const [optimizedSize, setOptimizedSize] = useState<number | null>(null);

  // Measure original file size once on mount
  const measureOriginal = async () => {
    if (originalSize !== null) return;
    try {
      const resp = await fetch(src);
      const buf = await resp.arrayBuffer();
      setOriginalSize(buf.byteLength);
    } catch {
      // ignore — size stats are non-critical
    }
  };

  // Measure optimized blob size when the URL is ready
  const measureOptimized = async () => {
    if (!optimizedUrl || optimizedSize !== null) return;
    try {
      const resp = await fetch(optimizedUrl);
      const buf = await resp.arrayBuffer();
      setOptimizedSize(buf.byteLength);
    } catch {
      // ignore
    }
  };

  if (!originalSize) measureOriginal();
  if (optimizedUrl && !optimizedSize) measureOptimized();

  const savings =
    originalSize && optimizedSize
      ? Math.round((1 - optimizedSize / originalSize) * 100)
      : null;

  return (
    <div className={styles.wrapper}>
      {/* Optimized preview */}
      <div className={styles.preview}>
        {loading && <div className={styles.skeleton} />}

        {!loading && optimizedUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={optimizedUrl} alt={alt} className={styles.image} />
        )}

        {!loading && error && (
          // Fallback to original on any WASM error
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={alt} className={styles.image} />
        )}
      </div>

      {/* Stats bar */}
      <div className={styles.stats}>
        <Stat label="Original" bytes={originalSize} muted />
        <span className={styles.arrow}>→</span>
        <Stat label="Optimized" bytes={optimizedSize} />
        {savings !== null && (
          <span className={styles.savings}>{savings}% smaller</span>
        )}
        {loading && <span className={styles.muted}>Optimizing…</span>}
      </div>
    </div>
  );
}

function Stat({ label, bytes, muted }: { label: string; bytes: number | null; muted?: boolean }) {
  const kb = bytes ? (bytes / 1024).toFixed(1) : '—';
  return (
    <span className={muted ? styles.muted : styles.statValue}>
      {label}: <strong>{kb} KB</strong>
    </span>
  );
}
