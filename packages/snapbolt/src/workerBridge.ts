// Module-level singleton — one Worker shared across all useImageOptimizer instances.
// Automatically falls back to main-thread WASM when Workers are unavailable
// (SSR, Node.js, or bundlers that don't support new URL(..., import.meta.url)).

type Resolve = (v: Uint8Array) => void;
type Reject  = (e: Error)      => void;

let worker: Worker | null = null;
let counter = 0;
const pending = new Map<number, { resolve: Resolve; reject: Reject }>();

function getWorker(): Worker | null {
    if (typeof Worker === 'undefined') return null;
    if (worker) return worker;

    try {
        worker = new Worker(
            new URL('./optimizer.worker.ts', import.meta.url),
            { type: 'module' },
        );

        worker.onmessage = (e: MessageEvent<{ id: number; result?: Uint8Array; error?: string }>) => {
            const { id, result, error } = e.data;
            const p = pending.get(id);
            if (!p) return;
            pending.delete(id);
            if (error || !result) {
                p.reject(new Error(error ?? 'Worker returned no result'));
            } else {
                p.resolve(result);
            }
        };

        worker.onerror = (e) => {
            for (const [, p] of pending) p.reject(new Error(e.message ?? 'Worker error'));
            pending.clear();
            worker = null; // reset so next call spawns a fresh worker
        };

        return worker;
    } catch {
        return null;
    }
}

/**
 * Encode `bytes` to WebP via a background Web Worker.
 * Returns `null` if Workers are unavailable — caller must fall back to main-thread WASM.
 * The input buffer is copied so the caller's `bytes` remain valid after the call.
 */
export async function optimizeViaWorker(
    bytes: Uint8Array,
    quality: number,
    wasmUrl?: string,
): Promise<Uint8Array | null> {
    const w = getWorker();
    if (!w) return null;

    const id = counter++;

    // Slice a copy so the caller's original bytes stay intact (needed for cache writes).
    const transferable = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    const view = new Uint8Array(transferable);

    return new Promise<Uint8Array>((resolve, reject) => {
        pending.set(id, { resolve, reject });
        w.postMessage({ id, bytes: view, quality, wasmUrl }, [transferable]);
    });
}
