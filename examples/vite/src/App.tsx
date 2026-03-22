import { useState, useEffect } from 'react';
import { useImageOptimizer } from '@thinkgrid/snapbolt';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtBytes(n: number): string {
  if (n >= 1024 * 1024) return (n / (1024 * 1024)).toFixed(2) + ' MB';
  if (n >= 1024) return (n / 1024).toFixed(0) + ' KB';
  return n + ' B';
}

function savings(orig: number, opt: number): string {
  return (((orig - opt) / orig) * 100).toFixed(1) + '% smaller';
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = {
  page: {
    maxWidth: 860,
    margin: '0 auto',
    padding: '48px 24px',
  } as React.CSSProperties,
  header: {
    marginBottom: 48,
    borderBottom: '1px solid #222',
    paddingBottom: 24,
  } as React.CSSProperties,
  title: {
    fontSize: 28,
    fontWeight: 700,
    letterSpacing: '-0.5px',
    marginBottom: 8,
  } as React.CSSProperties,
  subtitle: {
    color: '#888',
    fontSize: 15,
    lineHeight: 1.6,
  } as React.CSSProperties,
  section: {
    marginBottom: 56,
  } as React.CSSProperties,
  sectionTitle: {
    fontSize: 18,
    fontWeight: 600,
    marginBottom: 6,
  } as React.CSSProperties,
  sectionDesc: {
    color: '#888',
    fontSize: 14,
    marginBottom: 20,
  } as React.CSSProperties,
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 16,
  } as React.CSSProperties,
  card: {
    background: '#161616',
    border: '1px solid #222',
    borderRadius: 10,
    overflow: 'hidden',
  } as React.CSSProperties,
  cardLabel: {
    padding: '10px 14px',
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: '0.05em',
    textTransform: 'uppercase' as const,
    borderBottom: '1px solid #222',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  } as React.CSSProperties,
  badge: (color: string) => ({
    background: color,
    color: '#fff',
    borderRadius: 4,
    padding: '2px 8px',
    fontSize: 11,
    fontWeight: 700,
  }) as React.CSSProperties,
  img: {
    width: '100%',
    height: 220,
    objectFit: 'cover' as const,
    display: 'block',
  } as React.CSSProperties,
  shimmer: {
    width: '100%',
    height: 220,
    background: 'linear-gradient(90deg,#1a1a1a 25%,#252525 50%,#1a1a1a 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.4s infinite',
  } as React.CSSProperties,
  meta: {
    padding: '10px 14px',
    fontSize: 13,
    color: '#888',
    minHeight: 36,
  } as React.CSSProperties,
  savings: {
    color: '#4ade80',
    fontWeight: 600,
  } as React.CSSProperties,
  error: {
    color: '#f87171',
  } as React.CSSProperties,
  uploadArea: {
    border: '2px dashed #333',
    borderRadius: 10,
    padding: '40px 24px',
    textAlign: 'center' as const,
    cursor: 'pointer',
    transition: 'border-color 0.2s',
  } as React.CSSProperties,
  uploadInput: {
    display: 'none',
  } as React.CSSProperties,
  qualityRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    fontSize: 14,
  } as React.CSSProperties,
  slider: {
    flex: 1,
    accentColor: '#ef4444',
  } as React.CSSProperties,
  pill: {
    background: '#ef4444',
    color: '#fff',
    borderRadius: 20,
    padding: '2px 10px',
    fontSize: 13,
    fontWeight: 700,
    minWidth: 40,
    textAlign: 'center' as const,
  } as React.CSSProperties,
  sampleRow: {
    display: 'flex',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap' as const,
  } as React.CSSProperties,
  sampleBtn: (active: boolean) => ({
    background: active ? '#ef4444' : '#1e1e1e',
    border: `1px solid ${active ? '#ef4444' : '#333'}`,
    borderRadius: 6,
    padding: '6px 12px',
    fontSize: 13,
    color: active ? '#fff' : '#aaa',
    cursor: 'pointer',
    transition: 'all 0.15s',
  }) as React.CSSProperties,
  formatSelect: {
    background: '#1e1e1e',
    border: '1px solid #333',
    borderRadius: 6,
    padding: '5px 10px',
    fontSize: 13,
    color: '#ccc',
    cursor: 'pointer',
  } as React.CSSProperties,
  formatHint: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic' as const,
  } as React.CSSProperties,
};

// ── Sample images (via picsum.photos — free, CORS-enabled) ────────────────────

const SAMPLES = [
  { label: 'Landscape', url: 'https://picsum.photos/seed/landscape/1920/1280' },
  { label: 'Portrait',  url: 'https://picsum.photos/seed/portrait/1080/1620'  },
  { label: 'City',      url: 'https://picsum.photos/seed/city/1920/1280'      },
  { label: 'Nature',    url: 'https://picsum.photos/seed/nature/1920/1280'    },
  { label: 'Abstract',  url: 'https://picsum.photos/seed/abstract/1920/1280'  },
];

// ── URL demo section ──────────────────────────────────────────────────────────

type OutputFormat = 'avif' | 'webp' | 'jpeg' | 'png';

// In WASM mode, lossy WebP (libwebp C FFI) is unavailable — requests for 'webp'
// transparently route to AVIF (pure Rust rav1e). The returned mime is 'image/avif'.
const FORMAT_LABELS: Record<OutputFormat, string> = {
  avif: 'AVIF',
  webp: 'WebP → AVIF *',
  jpeg: 'JPEG',
  png:  'PNG (lossless)',
};

// AVIF quality is NOT the same as JPEG quality. ravif q40 ≈ JPEG q75 visually.
// ravif q60 ≈ JPEG q90+ — excellent quality but larger file than a q60 JPEG.
const FORMAT_DEFAULT_QUALITY: Record<OutputFormat, number> = {
  avif: 40,
  webp: 40,
  jpeg: 75,
  png:  100,
};

function UrlDemo() {
  const [selected, setSelected] = useState(SAMPLES[0]);
  const [format, setFormat] = useState<OutputFormat>('avif');
  const [quality, setQuality] = useState(FORMAT_DEFAULT_QUALITY['avif']);
  const [origSize, setOrigSize] = useState<number | null>(null);
  const [optSize, setOptSize] = useState<number | null>(null);

  const { optimizedUrl, loading, error } = useImageOptimizer(selected.url, {
    quality,
    format,
    crossOrigin: 'anonymous',
  });

  useEffect(() => {
    setOrigSize(null);
    fetch(selected.url)
      .then(r => r.blob())
      .then(b => setOrigSize(b.size))
      .catch(() => {});
  }, [selected.url]);

  useEffect(() => {
    if (!optimizedUrl || loading) return;
    setOptSize(null);
    fetch(optimizedUrl)
      .then(r => r.blob())
      .then(b => setOptSize(b.size))
      .catch(() => {});
  }, [optimizedUrl, loading]);

  const handleQuality = (q: number) => { setQuality(q); setOptSize(null); };
  const handleFormat  = (f: OutputFormat) => { setFormat(f); setQuality(FORMAT_DEFAULT_QUALITY[f]); setOptSize(null); };
  const handleSample  = (s: typeof SAMPLES[0]) => { setSelected(s); setOptSize(null); setOrigSize(null); };

  return (
    <div style={s.section}>
      <div style={s.sectionTitle}>URL optimization (WASM mode)</div>
      <div style={s.sectionDesc}>
        Images are encoded entirely in Rust WASM inside a background Worker — no server, no
        uploads, no Canvas. AVIF typically achieves 40–60% smaller files than JPEG at
        equivalent visual quality. Note: AVIF quality 40 ≈ JPEG quality 75 visually — the
        scales are not the same.
      </div>

      <div style={s.sampleRow}>
        {SAMPLES.map(sample => (
          <button
            key={sample.label}
            style={s.sampleBtn(selected.label === sample.label)}
            onClick={() => handleSample(sample)}
          >
            {sample.label}
          </button>
        ))}
      </div>

      <div style={s.qualityRow}>
        <span style={{ color: '#888' }}>Format</span>
        <select
          style={s.formatSelect}
          value={format}
          onChange={e => handleFormat(e.target.value as OutputFormat)}
        >
          {(Object.keys(FORMAT_LABELS) as OutputFormat[]).map(f => (
            <option key={f} value={f}>{FORMAT_LABELS[f]}</option>
          ))}
        </select>
        <span style={{ color: '#888' }}>Quality</span>
        <input
          type="range" min={10} max={100} step={5}
          value={quality}
          style={s.slider}
          onChange={e => handleQuality(Number(e.target.value))}
        />
        <span style={s.pill}>{quality}</span>
      </div>
      {format === 'webp' && (
        <div style={{ ...s.sectionDesc, marginBottom: 12 }}>
          * WebP lossy encoding requires C FFI (libwebp) — unavailable in WASM. Snapbolt
          transparently routes to AVIF (pure Rust rav1e), which is smaller and higher quality.
        </div>
      )}

      <div style={s.grid}>
        <div style={s.card}>
          <div style={s.cardLabel}>
            <span>Original (JPEG)</span>
            {origSize && <span style={{ color: '#aaa', fontSize: 12 }}>{fmtBytes(origSize)}</span>}
          </div>
          <img src={selected.url} alt="Original" style={s.img} crossOrigin="anonymous" />
          <div style={s.meta}>Source from picsum.photos · 1920×1280</div>
        </div>

        <div style={s.card}>
          <div style={s.cardLabel}>
            <span>Optimized ({FORMAT_LABELS[format]})</span>
            {optSize && <span style={s.badge('#4ade80')}>{fmtBytes(optSize)}</span>}
          </div>
          {loading && <div style={s.shimmer} />}
          {!loading && optimizedUrl && <img src={optimizedUrl} alt="Result" style={s.img} />}
          {!loading && error && (
            <div style={{ ...s.img, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
              <span style={s.error}>⚠ {error}</span>
            </div>
          )}
          <div style={s.meta}>
            {loading && <span style={{ color: '#555' }}>Encoding via Rust WASM…</span>}
            {!loading && origSize && optSize && (
              <span style={optSize < origSize ? s.savings : { color: '#f87171' }}>
                {optSize < origSize
                  ? `↓ ${savings(origSize, optSize)} · quality=${quality}`
                  : `↑ ${savings(optSize, origSize)} larger — try lower quality or AVIF`}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Upload demo section ───────────────────────────────────────────────────────

function UploadDemo() {
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<OutputFormat>('avif');
  const [quality, setQuality] = useState(FORMAT_DEFAULT_QUALITY['avif']);
  const [origPreview, setOrigPreview] = useState<string | null>(null);

  const { optimizedUrl, loading, error } = useImageOptimizer(file ?? '', { quality, format });

  const handleFile = (f: File) => {
    setFile(f);
    const reader = new FileReader();
    reader.onload = e => setOrigPreview(e.target?.result as string);
    reader.readAsDataURL(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith('image/')) handleFile(f);
  };

  return (
    <div style={s.section}>
      <div style={s.sectionTitle}>Pre-upload compression</div>
      <div style={s.sectionDesc}>
        Drop a photo from your device. It's compressed in the browser before upload — nothing leaves your machine.
      </div>

      {!file ? (
        <label
          style={s.uploadArea}
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
        >
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style={s.uploadInput}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
          <div style={{ fontSize: 36, marginBottom: 12 }}>📷</div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Drop an image or click to browse</div>
          <div style={{ color: '#555', fontSize: 13 }}>JPEG, PNG, or WebP</div>
        </label>
      ) : (
        <>
          <div style={s.qualityRow}>
            <span style={{ color: '#888' }}>Format</span>
            <select
              style={s.formatSelect}
              value={format}
              onChange={e => { const f = e.target.value as OutputFormat; setFormat(f); setQuality(FORMAT_DEFAULT_QUALITY[f]); }}
            >
              {(Object.keys(FORMAT_LABELS) as OutputFormat[]).map(f => (
                <option key={f} value={f}>{FORMAT_LABELS[f]}</option>
              ))}
            </select>
            <span style={{ color: '#888' }}>Quality</span>
            <input
              type="range" min={10} max={100} step={5}
              value={quality}
              style={s.slider}
              onChange={e => setQuality(Number(e.target.value))}
            />
            <span style={s.pill}>{quality}</span>
            <button
              onClick={() => { setFile(null); setOrigPreview(null); }}
              style={{ background: 'none', border: '1px solid #333', borderRadius: 6, padding: '4px 12px', color: '#888', cursor: 'pointer', fontSize: 13 }}
            >
              Clear
            </button>
          </div>

          <div style={s.grid}>
            <div style={s.card}>
              <div style={s.cardLabel}>
                <span>Original</span>
                <span style={{ color: '#aaa', fontSize: 12 }}>{fmtBytes(file.size)}</span>
              </div>
              {origPreview && <img src={origPreview} alt="Original" style={s.img} />}
              <div style={s.meta}>{file.name}</div>
            </div>

            <div style={s.card}>
              <div style={s.cardLabel}>
                <span>Optimized ({FORMAT_LABELS[format]})</span>
                {optimizedUrl && !loading && (
                  <a
                    href={optimizedUrl}
                    download={`optimized.${format === 'webp' ? 'avif' : format}`}
                    style={{ ...s.badge('#3b82f6'), textDecoration: 'none' }}
                  >
                    ↓ Download
                  </a>
                )}
              </div>
              {loading && <div style={s.shimmer} />}
              {!loading && optimizedUrl && <img src={optimizedUrl} alt="Optimized" style={s.img} />}
              {!loading && error && (
                <div style={{ ...s.img, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                  <span style={s.error}>⚠ {error}</span>
                </div>
              )}
              <div style={s.meta}>
                {loading && <span style={{ color: '#555' }}>Encoding…</span>}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0 }
          100% { background-position: -200% 0 }
        }
      `}</style>
      <div style={s.page}>
        <div style={s.header}>
          <div style={s.title}>⚡ Snapbolt — WASM Demo</div>
          <div style={s.subtitle}>
            This demo shows the <strong style={{ color: '#ccc' }}>client-side WASM mode</strong> —
            images are encoded in your browser via Rust + WebAssembly, no server required.<br />
            Snapbolt also supports <strong style={{ color: '#ccc' }}>server-side optimization</strong> via
            the Next.js handler and <code style={{ color: '#aaa', fontSize: 13 }}>serverUrl</code> prop
            for production pipelines.
          </div>
        </div>

        <UrlDemo />
        <UploadDemo />

        <div style={{ borderTop: '1px solid #222', paddingTop: 24, fontSize: 13, color: '#555', display: 'flex', gap: 20 }}>
          <a href="https://github.com/thinkgrid-labs/snapbolt" style={{ color: '#666', textDecoration: 'none' }}>GitHub</a>
          <a href="https://www.npmjs.com/package/@thinkgrid/snapbolt" style={{ color: '#666', textDecoration: 'none' }}>npm</a>
          <a href="https://github.com/thinkgrid-labs/snapbolt/blob/main/USAGE.md" style={{ color: '#666', textDecoration: 'none' }}>Docs</a>
        </div>
      </div>
    </>
  );
}
