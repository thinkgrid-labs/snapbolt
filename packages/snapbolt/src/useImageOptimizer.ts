import { useState, useEffect } from 'react';

export interface ImageOptimizerOptions {
    quality?: number;
    /**
     * Output format.
     * In browser WASM mode this option is **ignored** — output is always WebP via
     * the browser's Canvas API (the only reliable lossy path in wasm32-unknown-unknown).
     * The format option takes effect in server mode and native/CLI mode only.
     */
    format?: 'webp' | 'avif' | 'jpeg' | 'png';
    crossOrigin?: 'anonymous' | 'use-credentials';
    /** @deprecated No longer used in browser WASM mode. */
    wasmUrl?: string;
    width?: number;
    height?: number;
    cache?: boolean;
}

export interface UseImageOptimizerResult {
    optimizedUrl: string | null;
    loading: boolean;
    error: string | null;
}

/**
 * Encodes a blob to WebP using the browser's Canvas API.
 * Optionally resizes in the same canvas draw — avoiding a second intermediate encode.
 *
 * This is the only reliable lossy compression path available in wasm32-unknown-unknown:
 *   - libwebp (lossy WebP) requires C FFI — unavailable in browser WASM.
 *   - rav1e (AVIF) compiles to WASM but its quantizer settings are broken in
 *     single-threaded mode, producing near-lossless output regardless of quality.
 *
 * Canvas WebP is the industry standard for browser image compression (Squoosh,
 * browser-image-compression, etc. all use this approach).
 */
const toWebP = (blob: Blob, quality: number, maxWidth?: number, maxHeight?: number): Promise<Blob> =>
    new Promise((resolve, reject) => {
        const img = new Image();
        const blobUrl = URL.createObjectURL(blob);
        img.src = blobUrl;
        img.onload = () => {
            URL.revokeObjectURL(blobUrl);
            let w = img.naturalWidth || img.width || 1;
            let h = img.naturalHeight || img.height || 1;

            if (maxWidth && w > maxWidth) { h = Math.round((h * maxWidth) / w); w = maxWidth; }
            if (maxHeight && h > maxHeight) { w = Math.round((w * maxHeight) / h); h = maxHeight; }

            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (!ctx) { reject(new Error('Canvas not supported')); return; }
            ctx.drawImage(img, 0, 0, w, h);
            canvas.toBlob(
                b => {
                    if (!b) { reject(new Error('Canvas toBlob failed')); return; }
                    if (b.type !== 'image/webp') {
                        reject(new Error(`Browser canvas does not support WebP output (got ${b.type}). Use a Chromium or modern Safari browser.`));
                        return;
                    }
                    resolve(b);
                },
                'image/webp',
                quality / 100,
            );
        };
        img.onerror = () => { URL.revokeObjectURL(blobUrl); reject(new Error('Failed to load image')); };
    });

export const useImageOptimizer = (
    src: string | Blob,
    optionsOrQuality: number | ImageOptimizerOptions = {}
): UseImageOptimizerResult => {
    const options: ImageOptimizerOptions =
        typeof optionsOrQuality === 'number' ? { quality: optionsOrQuality } : optionsOrQuality;

    const { quality = 80, format = 'webp', crossOrigin, width, height, cache = true } = options;

    const [state, setState] = useState<UseImageOptimizerResult>({
        optimizedUrl: null,
        loading: false,
        error: null,
    });

    useEffect(() => {
        let mounted = true;
        let currentUrl: string | null = null;

        const process = async () => {
            if (!src) return;

            setState(prev => ({ ...prev, loading: true, error: null }));

            try {
                // Cache API requires an http/https URL as the key — encode params as query string.
                const cacheKey = typeof src === 'string'
                    ? `https://snapbolt.cache/v1?url=${encodeURIComponent(src)}&q=${quality}&fmt=${format}&w=${width || ''}&h=${height || ''}`
                    : null;

                if (cache && cacheKey && 'caches' in window) {
                    try {
                        const cacheStorage = await caches.open('snapbolt-v1');
                        const cachedResponse = await cacheStorage.match(cacheKey);
                        if (cachedResponse) {
                            const cachedBlob = await cachedResponse.blob();
                            const url = URL.createObjectURL(cachedBlob);
                            currentUrl = url;
                            if (mounted) setState({ optimizedUrl: url, loading: false, error: null });
                            return;
                        }
                    } catch (e) {
                        console.warn('Snapbolt Cache Error:', e);
                    }
                }

                let blob: Blob;
                if (typeof src === 'string') {
                    const fetchOpts: RequestInit = {};
                    if (crossOrigin === 'use-credentials') fetchOpts.credentials = 'include';
                    else if (crossOrigin === 'anonymous') fetchOpts.credentials = 'same-origin';

                    const resp = await fetch(src, fetchOpts);
                    if (!resp.ok) throw new Error(`Failed to fetch image: ${resp.statusText}`);

                    const contentType = resp.headers.get('Content-Type');
                    if (contentType && !['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].some(t => contentType.includes(t))) {
                        console.warn(`Snapbolt: Unsupported Content-Type ${contentType}, skipping optimization.`);
                        if (mounted) setState({ optimizedUrl: src, loading: false, error: null });
                        return;
                    }

                    blob = await resp.blob();
                } else {
                    blob = src;
                }

                // Encode via Canvas API → WebP, resizing in the same canvas draw to avoid
                // an intermediate encode (which would inflate file sizes dramatically).
                // The `format` option is server/CLI only; browser mode always outputs WebP.
                const optimizedBlob = await toWebP(blob, quality, width, height);

                if (cache && cacheKey && 'caches' in window) {
                    try {
                        const cacheStorage = await caches.open('snapbolt-v1');
                        await cacheStorage.put(cacheKey, new Response(optimizedBlob, {
                            headers: new Headers({ 'Content-Type': 'image/webp' }),
                        }));
                    } catch (e) {
                        console.warn('Snapbolt Cache Write Error:', e);
                    }
                }

                const url = URL.createObjectURL(optimizedBlob);
                currentUrl = url;
                if (mounted) setState({ optimizedUrl: url, loading: false, error: null });
            } catch (err: any) {
                console.error('Snapbolt Optimization Failed:', err);
                if (mounted) {
                    setState({
                        optimizedUrl: typeof src === 'string' ? src : null,
                        loading: false,
                        error: err.message || 'Unknown error',
                    });
                }
            }
        };

        process();

        return () => {
            mounted = false;
            if (currentUrl) URL.revokeObjectURL(currentUrl);
        };
    }, [src, quality, format, crossOrigin, width, height, cache]);

    return state;
};
