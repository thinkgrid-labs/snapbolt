/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Helpers ─────────────────────────────────────────────────────────────────

const BYTES = new Uint8Array([1, 2, 3, 4]);

// ── No-Worker environment (SSR / Node.js) ───────────────────────────────────

describe('optimizeViaWorker — Worker unavailable', () => {
    let originalWorker: typeof Worker;

    beforeEach(() => {
        originalWorker = (globalThis as unknown as Record<string, unknown>).Worker as typeof Worker;
        delete (globalThis as unknown as Record<string, unknown>).Worker;
    });

    afterEach(() => {
        (globalThis as unknown as Record<string, unknown>).Worker = originalWorker;
    });

    it('returns null when Worker is not defined', async () => {
        // Dynamic import reloads the module with fresh state
        vi.resetModules();
        const { optimizeViaWorker } = await import('./workerBridge');
        const result = await optimizeViaWorker(BYTES, 80);
        expect(result).toBeNull();
    });
});

// ── Worker available ─────────────────────────────────────────────────────────

describe('optimizeViaWorker — Worker available', () => {
    let mockWorker: {
        postMessage: ReturnType<typeof vi.fn>;
        onmessage: ((e: MessageEvent) => void) | null;
        onerror: ((e: ErrorEvent) => void) | null;
        terminate: ReturnType<typeof vi.fn>;
    };
    let WorkerCtor: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.resetModules();

        mockWorker = {
            postMessage: vi.fn(),
            onmessage: null,
            onerror: null,
            terminate: vi.fn(),
        };

        WorkerCtor = vi.fn(() => mockWorker);
        (globalThis as unknown as Record<string, unknown>).Worker = WorkerCtor;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('constructs the Worker with module type', async () => {
        const { optimizeViaWorker } = await import('./workerBridge');

        // Start the call (don't await — respond manually below)
        const promise = optimizeViaWorker(BYTES, 80);

        // Simulate worker response for message id 0
        const [, transferList] = mockWorker.postMessage.mock.calls[0] ?? [];
        expect(transferList).toBeDefined();

        const resultBytes = new Uint8Array([0xFF, 0xD8]);
        mockWorker.onmessage!({ data: { id: 0, data: resultBytes, mime: 'image/avif' } } as MessageEvent);

        const result = await promise;
        expect(result).not.toBeNull();
        expect(result!.mime).toBe('image/avif');
        expect(WorkerCtor).toHaveBeenCalledWith(
            expect.any(URL),
            { type: 'module' }
        );
    });

    it('routes responses to the correct promise by message id', async () => {
        const { optimizeViaWorker } = await import('./workerBridge');

        const p0 = optimizeViaWorker(BYTES, 80);
        const p1 = optimizeViaWorker(BYTES, 50);

        const r1 = new Uint8Array([10, 20]);
        const r0 = new Uint8Array([30, 40]);

        // Resolve in reverse order
        mockWorker.onmessage!({ data: { id: 1, data: r1, mime: 'image/avif' } } as MessageEvent);
        mockWorker.onmessage!({ data: { id: 0, data: r0, mime: 'image/avif' } } as MessageEvent);

        expect((await p0)!.data).toEqual(r0);
        expect((await p1)!.data).toEqual(r1);
    });

    it('reuses the same Worker across calls (singleton)', async () => {
        const { optimizeViaWorker } = await import('./workerBridge');

        const p0 = optimizeViaWorker(BYTES, 80);
        mockWorker.onmessage!({ data: { id: 0, data: new Uint8Array([1]), mime: 'image/avif' } } as MessageEvent);
        await p0;

        const p1 = optimizeViaWorker(BYTES, 80);
        mockWorker.onmessage!({ data: { id: 1, data: new Uint8Array([2]), mime: 'image/avif' } } as MessageEvent);
        await p1;

        expect(WorkerCtor).toHaveBeenCalledTimes(1);
    });

    it('rejects with error when worker sends an error message', async () => {
        const { optimizeViaWorker } = await import('./workerBridge');

        const promise = optimizeViaWorker(BYTES, 80);
        mockWorker.onmessage!({ data: { id: 0, error: 'WASM crash' } } as MessageEvent);

        await expect(promise).rejects.toThrow('WASM crash');
    });

    it('rejects with fallback message when result is undefined', async () => {
        const { optimizeViaWorker } = await import('./workerBridge');

        const promise = optimizeViaWorker(BYTES, 80);
        mockWorker.onmessage!({ data: { id: 0 } } as MessageEvent);

        await expect(promise).rejects.toThrow('Worker returned no result');
    });

    it('rejects all pending promises on onerror and resets worker', async () => {
        const { optimizeViaWorker } = await import('./workerBridge');

        const p0 = optimizeViaWorker(BYTES, 80);
        const p1 = optimizeViaWorker(BYTES, 80);

        mockWorker.onerror!({ message: 'fatal error' } as ErrorEvent);

        await expect(p0).rejects.toThrow('fatal error');
        await expect(p1).rejects.toThrow('fatal error');

        // Worker singleton should be reset — next call creates a new Worker
        const p2 = optimizeViaWorker(BYTES, 80);
        mockWorker.onmessage!({ data: { id: 2, data: new Uint8Array([1]), mime: 'image/avif' } } as MessageEvent);
        await p2;

        expect(WorkerCtor).toHaveBeenCalledTimes(2);
    });

    it('transfers buffer ownership (zero-copy) in postMessage', async () => {
        const { optimizeViaWorker } = await import('./workerBridge');

        const promise = optimizeViaWorker(BYTES, 80);
        const [, transferList] = mockWorker.postMessage.mock.calls[0];
        // The transfer list must be an array containing an ArrayBuffer
        expect(Array.isArray(transferList)).toBe(true);
        expect(transferList[0]).toBeInstanceOf(ArrayBuffer);

        mockWorker.onmessage!({ data: { id: 0, data: new Uint8Array([1]), mime: 'image/avif' } } as MessageEvent);
        await promise;
    });

    it('returns null when Worker constructor throws', async () => {
        vi.resetModules();
        (globalThis as unknown as Record<string, unknown>).Worker = vi.fn(() => {
            throw new Error('Not supported');
        });

        const { optimizeViaWorker } = await import('./workerBridge');
        const result = await optimizeViaWorker(BYTES, 80);
        expect(result).toBeNull();
    });

    it('forwards format to the worker postMessage', async () => {
        const { optimizeViaWorker } = await import('./workerBridge');

        const promise = optimizeViaWorker(BYTES, 80, 'avif');
        const [payload] = mockWorker.postMessage.mock.calls[0];
        expect(payload.format).toBe('avif');

        mockWorker.onmessage!({ data: { id: 0, data: new Uint8Array([1]), mime: 'image/avif' } } as MessageEvent);
        await promise;
    });
});
