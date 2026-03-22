'use client';

import React, {
    useState,
    useEffect,
    useRef,
    CSSProperties,
    ImgHTMLAttributes,
} from 'react';
import { useSnapboltConfig } from './context';
import { useImageOptimizer } from './useImageOptimizer';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SmartImageProps
    extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'width' | 'height' | 'loading' | 'placeholder'> {
    /** Image URL (absolute) or a File/Blob for WASM mode. */
    src: string | Blob;

    /** Alt text — required for accessibility and Lighthouse. */
    alt: string;

    /** Target width in pixels. Sets the `width` attribute (prevents CLS). */
    width?: number;

    /** Target height in pixels. Sets the `height` attribute (prevents CLS). */
    height?: number;

    /**
     * Output quality 1–100.
     * @default 80 (or provider defaultQuality)
     */
    quality?: number;

    /**
     * Output format.
     * - Server mode: `'auto'` negotiates the best format via the Accept header.
     * - WASM mode: `'avif'` (default), `'webp'` (routes to AVIF — no C FFI in WASM), `'jpeg'`, `'png'`.
     * @default 'auto' (server) / 'avif' (WASM)
     */
    format?: 'avif' | 'webp' | 'jpeg' | 'png' | 'auto';

    /**
     * Mark this image as a high-priority LCP element.
     * - Adds `fetchpriority="high"` and `loading="eager"`
     * - Injects a `<link rel="preload">` into document.head
     * - Skips lazy-loading for this image
     *
     * Use for the largest above-the-fold image (hero, banner, etc.).
     * @default false
     */
    priority?: boolean;

    /**
     * CSS `sizes` attribute for responsive srcset selection.
     * @example '(max-width: 768px) 100vw, 50vw'
     * @default '100vw'
     */
    sizes?: string;

    /**
     * Blur-up placeholder shown while the main image loads.
     * - `'blur'` requires `blurDataURL`
     * - `'empty'` renders nothing (default)
     */
    placeholder?: 'blur' | 'empty';

    /**
     * Base64-encoded tiny image for the blur placeholder.
     * Generate with: `npx plaiceholder <image-url>` or any LQIP tool.
     * @example 'data:image/jpeg;base64,/9j/4AAQ...'
     */
    blurDataURL?: string;

    /**
     * Fill the parent container (parent must have `position: relative`).
     * Equivalent to `object-fit: cover` + absolute positioning.
     */
    fill?: boolean;

    /**
     * Override the global snapbolt-server URL for this image only.
     * If neither this nor the provider serverUrl is set, falls back to WASM mode.
     */
    serverUrl?: string;

    /**
     * Widths used to generate the `srcset`. Browser picks the best size automatically.
     * @default [640, 1080, 1920] (or provider breakpoints)
     */
    breakpoints?: number[];

    /** Called when the image has fully loaded. */
    onLoad?: () => void;

    /** Called when the image fails to load. */
    onError?: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_BREAKPOINTS = [640, 1080, 1920];

// ─── Server-URL builder ───────────────────────────────────────────────────────

function serverUrl(base: string, src: string, w: number, q: number, fmt: string): string {
    const params = new URLSearchParams({ url: src, w: String(w), q: String(q), fmt });
    return `${base.replace(/\/$/, '')}/image?${params}`;
}

function buildSrcSet(base: string, src: string, widths: number[], q: number, fmt: string): string {
    return widths.map((w) => `${serverUrl(base, src, w, q, fmt)} ${w}w`).join(', ');
}

// ─── Wrapper styles ───────────────────────────────────────────────────────────

function wrapperStyle(fill?: boolean, width?: number, height?: number): CSSProperties {
    if (fill) {
        return { position: 'relative', display: 'block', width: '100%', height: '100%', overflow: 'hidden' };
    }
    const style: CSSProperties = { position: 'relative', display: 'block' };
    if (width) style.width = width;
    if (width && height) style.aspectRatio = `${width} / ${height}`;
    return style;
}

// ─── Blur overlay ─────────────────────────────────────────────────────────────

function BlurOverlay({ dataUrl, visible }: { dataUrl: string; visible: boolean }) {
    return (
        <img
            src={dataUrl}
            aria-hidden="true"
            alt=""
            style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                filter: 'blur(20px)',
                transform: 'scale(1.05)',
                opacity: visible ? 1 : 0,
                transition: 'opacity 0.4s ease',
                pointerEvents: 'none',
            }}
        />
    );
}

// ─── Server-mode component ────────────────────────────────────────────────────
// Builds proper src/srcset URLs pointing at snapbolt-server.
// No WASM, no async processing — the browser fetches a pre-optimized image.
// This is the fast path for Lighthouse / LCP.

function SmartImageServer({
    src,
    alt,
    width,
    height,
    quality,
    format,
    priority,
    sizes,
    placeholder,
    blurDataURL,
    fill,
    serverUrl: serverUrlProp,
    breakpoints,
    className,
    style,
    onLoad,
    onError,
    ...rest
}: SmartImageProps & { src: string; serverUrl: string }) {
    const ctx = useSnapboltConfig();
    const base = serverUrlProp ?? ctx.serverUrl!;
    const q = quality ?? ctx.defaultQuality ?? 80;
    const fmt = format ?? ctx.defaultFormat ?? 'auto';
    const bps = breakpoints ?? ctx.breakpoints ?? DEFAULT_BREAKPOINTS;

    // Build srcset — include all breakpoints ≤ width (if width given), plus width itself
    const srcsetWidths = width
        ? [...new Set([...bps.filter((w) => w <= width * 1.5), width])].sort((a, b) => a - b)
        : bps;

    const primarySrc = serverUrl(base, src, width ?? srcsetWidths[srcsetWidths.length - 1], q, fmt);
    const srcSet = buildSrcSet(base, src, srcsetWidths, q, fmt);
    const sizesAttr = sizes ?? '100vw';

    // Blur placeholder state
    const [imgLoaded, setImgLoaded] = useState(false);
    const showBlur = placeholder === 'blur' && !!blurDataURL && !imgLoaded;

    // Inject <link rel="preload"> for priority images — tells browser to fetch early
    useEffect(() => {
        if (!priority || typeof document === 'undefined') return;
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = primarySrc;
        link.setAttribute('imagesrcset', srcSet);
        link.setAttribute('imagesizes', sizesAttr);
        link.setAttribute('fetchpriority', 'high');
        document.head.appendChild(link);
        return () => { link.remove(); };
    }, [priority, primarySrc, srcSet, sizesAttr]);

    const imgStyle: CSSProperties = fill
        ? { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }
        : { display: 'block', maxWidth: '100%', height: 'auto' };

    if (placeholder === 'blur' && blurDataURL) {
        imgStyle.opacity = imgLoaded ? 1 : 0;
        imgStyle.transition = 'opacity 0.4s ease';
    }

    return (
        <span style={wrapperStyle(fill, width, height)}>
            {placeholder === 'blur' && blurDataURL && (
                <BlurOverlay dataUrl={blurDataURL} visible={showBlur} />
            )}
            <img
                {...rest}
                src={primarySrc}
                srcSet={srcSet}
                sizes={sizesAttr}
                width={fill ? undefined : width}
                height={fill ? undefined : height}
                alt={alt}
                loading={priority ? 'eager' : 'lazy'}
                decoding="async"
                {...(priority ? { fetchPriority: 'high' } : {})}
                className={className}
                style={{ ...imgStyle, ...style }}
                onLoad={() => { setImgLoaded(true); onLoad?.(); }}
                onError={onError}
            />
        </span>
    );
}

// ─── WASM-mode component ──────────────────────────────────────────────────────
// Falls back to client-side WASM optimization when no server is configured.
// Good for Blob/File inputs (e.g. pre-upload preview). For URL-based images
// in production, configure a serverUrl via SnapboltProvider for best LCP.

function SmartImageWasm({
    src,
    alt,
    width,
    height,
    quality,
    format,
    priority,
    sizes,
    placeholder,
    blurDataURL,
    fill,
    className,
    style,
    onLoad,
    onError,
    ...rest
}: SmartImageProps) {
    const ctx = useSnapboltConfig();
    const q = quality ?? ctx.defaultQuality ?? 80;
    // 'auto' in server mode means Accept-header negotiation — in WASM mode default to 'avif'.
    const fmt = (!format || format === 'auto') ? 'avif' : format;

    const { optimizedUrl, loading } = useImageOptimizer(src, { quality: q, format: fmt, width, height });

    const [imgLoaded, setImgLoaded] = useState(false);
    const showBlur = placeholder === 'blur' && !!blurDataURL && !imgLoaded;

    const imgStyle: CSSProperties = fill
        ? { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }
        : { display: 'block', maxWidth: '100%', height: 'auto' };

    if (placeholder === 'blur' && blurDataURL) {
        imgStyle.opacity = imgLoaded ? 1 : 0;
        imgStyle.transition = 'opacity 0.4s ease';
    }

    if (loading) {
        return (
            <span
                style={{
                    ...wrapperStyle(fill, width, height),
                    background: 'linear-gradient(90deg,#f0f0f0 25%,#e4e4e4 50%,#f0f0f0 75%)',
                    backgroundSize: '200% 100%',
                    animation: 'snapbolt-shimmer 1.4s infinite',
                    display: 'block',
                }}
            >
                <style>{`@keyframes snapbolt-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
            </span>
        );
    }

    if (!optimizedUrl) return null;

    return (
        <span style={wrapperStyle(fill, width, height)}>
            {placeholder === 'blur' && blurDataURL && (
                <BlurOverlay dataUrl={blurDataURL} visible={showBlur} />
            )}
            <img
                {...rest}
                src={optimizedUrl}
                alt={alt}
                width={fill ? undefined : width}
                height={fill ? undefined : height}
                loading={priority ? 'eager' : 'lazy'}
                decoding="async"
                {...(priority ? { fetchPriority: 'high' } : {})}
                sizes={sizes}
                className={className}
                style={{ ...imgStyle, ...style }}
                onLoad={() => { setImgLoaded(true); onLoad?.(); }}
                onError={onError}
            />
        </span>
    );
}

// ─── Public SmartImage component ──────────────────────────────────────────────

/**
 * Drop-in image component with built-in performance optimizations.
 *
 * **Server mode** (recommended for LCP): configure a `serverUrl` via
 * `<SnapboltProvider serverUrl="...">` or the `serverUrl` prop. The component
 * builds proper `src`, `srcset`, and `sizes` attributes pointing at
 * snapbolt-server, and injects a `<link rel="preload">` for `priority` images.
 *
 * **WASM mode** (fallback): when no serverUrl is configured, the component
 * processes the image client-side via the Rust WASM encoder. Best for
 * File/Blob sources (e.g. pre-upload optimization), not for LCP images.
 *
 * @example
 * // Basic usage (server mode via provider)
 * <SmartImage src="https://cdn.example.com/hero.jpg" alt="Hero" width={1200} priority />
 *
 * @example
 * // LCP hero image with blur placeholder
 * <SmartImage
 *   src="https://cdn.example.com/hero.jpg"
 *   alt="Hero"
 *   width={1200}
 *   height={630}
 *   quality={80}
 *   format="webp"
 *   priority
 *   placeholder="blur"
 *   blurDataURL="data:image/jpeg;base64,/9j/4AAQ..."
 *   sizes="100vw"
 * />
 *
 * @example
 * // Responsive image in a two-column grid
 * <SmartImage
 *   src="https://cdn.example.com/card.jpg"
 *   alt="Card"
 *   width={600}
 *   quality={75}
 *   sizes="(max-width: 768px) 100vw, 50vw"
 * />
 *
 * @example
 * // Fill parent container (like next/image fill)
 * <div style={{ position: 'relative', height: 400 }}>
 *   <SmartImage src="https://cdn.example.com/bg.jpg" alt="" fill />
 * </div>
 */
export function SmartImage(props: SmartImageProps) {
    const ctx = useSnapboltConfig();
    const effectiveServerUrl = props.serverUrl ?? ctx.serverUrl;

    // Server mode: src must be a string URL when routing through the server
    if (effectiveServerUrl && typeof props.src === 'string') {
        return (
            <SmartImageServer
                {...props}
                src={props.src}
                serverUrl={effectiveServerUrl}
            />
        );
    }

    // WASM mode: handles both string URLs and Blob/File
    return <SmartImageWasm {...props} />;
}

export default SmartImage;
