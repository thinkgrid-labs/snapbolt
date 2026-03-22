// Dedicated Web Worker — handles WASM init and image encoding off the main thread.
// Receives: { id, bytes, quality, format?, wasmUrl? }
// Sends:    { id, data, mime } on success  (ArrayBuffer transferred, zero-copy)
//           { id, error }      on failure

import init, { optimize_image } from '../pkg/snapbolt';

let initialized = false;

(self as unknown as DedicatedWorkerGlobalScope).onmessage = async (
    e: MessageEvent<{ id: number; bytes: Uint8Array; quality: number; format?: string; wasmUrl?: string }>
) => {
    const { id, bytes, quality, format, wasmUrl } = e.data;
    try {
        if (!initialized) {
            await init(wasmUrl);
            initialized = true;
        }
        const result = optimize_image(bytes, quality, format ?? 'avif');
        const data = result.data;
        const mime = result.mime;
        result.free();
        // Transfer the result buffer back to the main thread — zero copy.
        (self as unknown as DedicatedWorkerGlobalScope).postMessage(
            { id, data, mime },
            [data.buffer],
        );
    } catch (err: unknown) {
        (self as unknown as DedicatedWorkerGlobalScope).postMessage({
            id,
            error: err instanceof Error ? err.message : 'WASM optimization failed',
        });
    }
};
