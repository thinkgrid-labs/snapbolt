import { useState, useEffect } from 'react';

// Dynamic import for the Wasm module
const loadWasm = async () => {
    // We import from the local pkg directory (built via wasm-pack)
    return import('../pkg/snapbolt.js');
};

export interface UseImageOptimizerResult {
    optimizedUrl: string | null;
    loading: boolean;
    error: string | null;
}

export const useImageOptimizer = (src: string | Blob, quality: number = 80): UseImageOptimizerResult => {
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
                // 1. Get Blob
                let blob: Blob;
                if (typeof src === 'string') {
                    const resp = await fetch(src);
                    if (!resp.ok) throw new Error(`Failed to fetch image: ${resp.statusText}`);
                    blob = await resp.blob();
                } else {
                    blob = src;
                }

                // 2. Load bytes
                const buffer = await blob.arrayBuffer();
                const bytes = new Uint8Array(buffer);

                // 3. Wasm Optimize
                const wasm = await loadWasm();
                const optimizedBytes = wasm.optimize_image_sync(bytes, quality);

                // 4. Create Object URL
                const optimizedBlob = new Blob([optimizedBytes as unknown as BlobPart], { type: 'image/webp' });
                const url = URL.createObjectURL(optimizedBlob);
                currentUrl = url; // Store locally for cleanup

                if (mounted) {
                    setState({
                        optimizedUrl: url,
                        loading: false,
                        error: null
                    });
                }
            } catch (err: any) {
                if (mounted) {
                    setState(prev => ({
                        ...prev,
                        loading: false,
                        error: err.message || 'Unknown error'
                    }));
                }
            }
        };

        process();

        return () => {
            mounted = false;
            if (currentUrl) {
                URL.revokeObjectURL(currentUrl);
            }
        };
    }, [src, quality]);

    return state;
};
