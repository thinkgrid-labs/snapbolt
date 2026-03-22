// Dedicated Web Worker — handles WASM init and image encoding off the main thread.
// Receives: { id, bytes, quality, wasmUrl? }
// Sends:    { id, result } on success  (ArrayBuffer transferred, zero-copy)
//           { id, error }  on failure

import init, { optimize_image_sync } from '../pkg/snapbolt';

let initialized = false;

(self as unknown as DedicatedWorkerGlobalScope).onmessage = async (
    e: MessageEvent<{ id: number; bytes: Uint8Array; quality: number; wasmUrl?: string }>
) => {
    const { id, bytes, quality, wasmUrl } = e.data;
    try {
        if (!initialized) {
            await init(wasmUrl);
            initialized = true;
        }
        const result = optimize_image_sync(bytes, quality);
        // Transfer the result buffer back to the main thread — zero copy.
        (self as unknown as DedicatedWorkerGlobalScope).postMessage(
            { id, result },
            [result.buffer],
        );
    } catch (err: unknown) {
        (self as unknown as DedicatedWorkerGlobalScope).postMessage({
            id,
            error: err instanceof Error ? err.message : 'WASM optimization failed',
        });
    }
};
