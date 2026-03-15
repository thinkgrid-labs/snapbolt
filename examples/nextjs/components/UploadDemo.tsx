'use client';

import { useImageOptimizer } from '@think-grid-labs/snapbolt';
import { useState, useCallback } from 'react';
import styles from './UploadDemo.module.css';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(2)} MB`;
}

export default function UploadDemo() {
  const [file, setFile] = useState<File | null>(null);
  const [uploaded, setUploaded] = useState(false);
  const [uploading, setUploading] = useState(false);

  const { optimizedUrl, loading, error } = useImageOptimizer(
    file ?? '',
    { quality: 80, width: 1200 }
  );

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    if (picked) {
      setFile(picked);
      setUploaded(false);
    }
  }, []);

  const handleUpload = async () => {
    if (!optimizedUrl) return;
    setUploading(true);

    try {
      const resp = await fetch(optimizedUrl);
      const blob = await resp.blob();

      const formData = new FormData();
      formData.append('image', blob, 'photo.webp');

      // Replace with your actual API route
      // await fetch('/api/upload', { method: 'POST', body: formData });

      // Simulated upload delay for the demo
      await new Promise((r) => setTimeout(r, 800));
      setUploaded(true);
    } finally {
      setUploading(false);
    }
  };

  // Approximate size of optimized blob by measuring the blob: URL
  const [optimizedBytes, setOptimizedBytes] = useState<number | null>(null);
  if (optimizedUrl && optimizedBytes === null) {
    fetch(optimizedUrl)
      .then((r) => r.arrayBuffer())
      .then((buf) => setOptimizedBytes(buf.byteLength))
      .catch(() => {});
  }

  const savings =
    file && optimizedBytes
      ? Math.round((1 - optimizedBytes / file.size) * 100)
      : null;

  return (
    <div className={styles.wrapper}>
      <label className={styles.dropzone}>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFile}
          className={styles.hiddenInput}
        />
        {file ? (
          <span className={styles.fileName}>{file.name}</span>
        ) : (
          <span className={styles.placeholder}>
            Click to pick a JPEG or PNG
          </span>
        )}
      </label>

      {file && (
        <div className={styles.comparison}>
          {/* Original */}
          <div className={styles.panel}>
            <div className={styles.panelLabel}>Original</div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={URL.createObjectURL(file)}
              alt="Original"
              className={styles.thumb}
            />
            <div className={styles.size}>{formatBytes(file.size)}</div>
          </div>

          <div className={styles.arrowCol}>→</div>

          {/* Optimized */}
          <div className={styles.panel}>
            <div className={styles.panelLabel}>Optimized (WebP)</div>
            {loading && <div className={styles.skeleton} />}
            {!loading && optimizedUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={optimizedUrl} alt="Optimized" className={styles.thumb} />
            )}
            {!loading && error && (
              <p className={styles.error}>Optimization failed: {error}</p>
            )}
            <div className={styles.size}>
              {optimizedBytes ? formatBytes(optimizedBytes) : loading ? '…' : '—'}
              {savings !== null && (
                <span className={styles.badge}>{savings}% smaller</span>
              )}
            </div>
          </div>
        </div>
      )}

      {optimizedUrl && !uploaded && (
        <button
          onClick={handleUpload}
          disabled={loading || uploading}
          className={styles.uploadBtn}
        >
          {uploading ? 'Uploading…' : 'Upload Optimized Image'}
        </button>
      )}

      {uploaded && (
        <p className={styles.success}>
          Uploaded! (The server received the optimized WebP, not the original.)
        </p>
      )}
    </div>
  );
}
