import { useState, useEffect } from 'react';
import init, { optimize_image_sync } from '../pkg/snapbolt';

export interface ImageOptimizerOptions {
    quality?: number;
    crossOrigin?: 'anonymous' | 'use-credentials';
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

const resizeImage = async (blob: Blob, maxWidth?: number, maxHeight?: number): Promise<Blob> => {
    if (!maxWidth && !maxHeight) return blob;

    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(blob);
        img.src = url;
        img.onload = () => {
            URL.revokeObjectURL(url);
            let width = img.width;
            let height = img.height;

            if (maxWidth && width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
            }
            if (maxHeight && height > maxHeight) {
                width = Math.round((width * maxHeight) / height);
                height = maxHeight;
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) { reject(new Error('Failed to get canvas context')); return; }
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob((b) => {
                if (b) resolve(b);
                else reject(new Error('Canvas toBlob failed'));
            }, blob.type);
        };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image for resizing')); };
    });
};

export const useImageOptimizer = (
    src: string | Blob,
    optionsOrQuality: number | ImageOptimizerOptions = {}
): UseImageOptimizerResult => {
    const options: ImageOptimizerOptions =
        typeof optionsOrQuality === 'number' ? { quality: optionsOrQuality } : optionsOrQuality;

    const { quality = 80, crossOrigin, wasmUrl, width, height, cache = true } = options;

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
                const cacheKey = typeof src === 'string'
                    ? `snapbolt:${src}:${quality}:${width || ''}:${height || ''}`
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

                if (width || height) blob = await resizeImage(blob, width, height);

                const buffer = await blob.arrayBuffer();
                const bytes = new Uint8Array(buffer);

                await init(wasmUrl);
                const optimizedBytes = optimize_image_sync(bytes, quality);

                const optimizedBlob = new Blob([optimizedBytes as unknown as BlobPart], { type: 'image/webp' });

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
    }, [src, quality, crossOrigin, wasmUrl, width, height, cache]);

    return state;
};
