/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useImageOptimizer } from './index';

// ── Global mocks ──────────────────────────────────────────────────────────────

vi.stubGlobal('fetch', vi.fn());
vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => 'blob:mock-url'),
    revokeObjectURL: vi.fn(),
});

// WASM module — avoids compiling actual Rust in tests
vi.mock('../pkg/snapbolt', () => ({
    default: vi.fn().mockResolvedValue({}),
    optimize_image_sync: vi.fn(() => new Uint8Array([1, 2, 3])),
}));

// Worker bridge — default: worker unavailable → falls back to main-thread WASM
vi.mock('./workerBridge', () => ({
    optimizeViaWorker: vi.fn().mockResolvedValue(null),
}));

// ── Helpers ────────────────────────────────────────────────────────────────────

function makePngBlob(): Blob {
    const blob = new Blob(['png-bytes'], { type: 'image/png' });
    (blob as Blob & { arrayBuffer: ReturnType<typeof vi.fn> }).arrayBuffer =
        vi.fn().mockResolvedValue(new ArrayBuffer(9));
    return blob;
}

function mockFetchOk(blob: Blob, contentType = 'image/png') {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        headers: new Headers({ 'Content-Type': contentType }),
        blob: () => Promise.resolve(blob),
    });
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('useImageOptimizer', () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        (fetch as ReturnType<typeof vi.fn>).mockReset();
        // Re-apply implementations cleared by vi.clearAllMocks() in vitest 2
        const wasm = await import('../pkg/snapbolt');
        vi.mocked(wasm.default).mockResolvedValue({} as never);
        vi.mocked(wasm.optimize_image_sync).mockImplementation(() => new Uint8Array([1, 2, 3]));
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // ── Happy path ─────────────────────────────────────────────────────────────

    it('optimizes a URL and returns a blob: URL', async () => {
        mockFetchOk(makePngBlob());
        const { result } = renderHook(() => useImageOptimizer('photo.png', 80));

        await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 4000 });
        expect(result.current.optimizedUrl).toBe('blob:mock-url');
        expect(result.current.error).toBeNull();
    });

    it('accepts options as an object (quality only — avoids canvas resize in jsdom)', async () => {
        mockFetchOk(makePngBlob());
        const { result } = renderHook(() =>
            useImageOptimizer('photo.png', { quality: 60 })
        );

        await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 4000 });
        expect(result.current.error).toBeNull();
        expect(result.current.optimizedUrl).toBe('blob:mock-url');
    });

    it('accepts a Blob source directly (skips fetch)', async () => {
        const blob = makePngBlob();
        const { result } = renderHook(() => useImageOptimizer(blob, 80));

        await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 4000 });
        expect(fetch).not.toHaveBeenCalled();
        expect(result.current.optimizedUrl).toBe('blob:mock-url');
        expect(result.current.error).toBeNull();
    });

    it('uses the worker result when optimizeViaWorker resolves', async () => {
        const { optimizeViaWorker } = await import('./workerBridge');
        vi.mocked(optimizeViaWorker).mockResolvedValueOnce(new Uint8Array([0x52, 0x49, 0x46, 0x46]));
        mockFetchOk(makePngBlob());

        const { result } = renderHook(() => useImageOptimizer('photo.png', 80));

        await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 4000 });
        expect(result.current.optimizedUrl).toBe('blob:mock-url');
        expect(vi.mocked(optimizeViaWorker)).toHaveBeenCalled();
    });

    it('falls back to main-thread WASM when worker returns null', async () => {
        const { optimizeViaWorker } = await import('./workerBridge');
        vi.mocked(optimizeViaWorker).mockResolvedValueOnce(null);
        const { optimize_image_sync } = await import('../pkg/snapbolt');
        mockFetchOk(makePngBlob());

        const { result } = renderHook(() => useImageOptimizer('photo.png', 80));

        await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 4000 });
        expect(result.current.optimizedUrl).toBe('blob:mock-url');
        expect(vi.mocked(optimize_image_sync)).toHaveBeenCalled();
    });

    // ── Unsupported content types ──────────────────────────────────────────────

    it('passes GIF through without optimization', async () => {
        (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
            ok: true,
            headers: new Headers({ 'Content-Type': 'image/gif' }),
            blob: vi.fn(),
        });

        const { result } = renderHook(() => useImageOptimizer('animation.gif', 80));

        await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 4000 });
        expect(result.current.optimizedUrl).toBe('animation.gif');
        expect(result.current.error).toBeNull();
    });

    it('passes SVG through without optimization', async () => {
        (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
            ok: true,
            headers: new Headers({ 'Content-Type': 'image/svg+xml' }),
            blob: vi.fn(),
        });

        const { result } = renderHook(() => useImageOptimizer('icon.svg', 80));

        await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 4000 });
        expect(result.current.optimizedUrl).toBe('icon.svg');
    });

    // ── Error handling ─────────────────────────────────────────────────────────

    it('handles fetch 404 gracefully — sets error + falls back to original src', async () => {
        (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
            ok: false,
            headers: new Headers(),
            statusText: 'Not Found',
        });

        const { result } = renderHook(() => useImageOptimizer('missing.png', 80));

        await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 4000 });
        expect(result.current.error).toContain('Failed to fetch image');
        expect(result.current.optimizedUrl).toBe('missing.png');
    });

    it('returns null optimizedUrl when a Blob source fails', async () => {
        const blob = new Blob(['corrupt'], { type: 'image/png' });
        (blob as Blob & { arrayBuffer: ReturnType<typeof vi.fn> }).arrayBuffer =
            vi.fn().mockRejectedValue(new Error('read error'));

        const { result } = renderHook(() => useImageOptimizer(blob, 80));

        await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 4000 });
        expect(result.current.error).not.toBeNull();
        expect(result.current.optimizedUrl).toBeNull();
    });

    // ── Re-render stability ────────────────────────────────────────────────────

    it('does not refetch when src is unchanged across re-renders', async () => {
        mockFetchOk(makePngBlob());

        const { rerender } = renderHook(({ src }) => useImageOptimizer(src, 80), {
            initialProps: { src: 'stable.png' },
        });

        await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1), { timeout: 4000 });
        rerender({ src: 'stable.png' });
        expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('refetches when src changes', async () => {
        mockFetchOk(makePngBlob());

        const { rerender } = renderHook(({ src }) => useImageOptimizer(src, 80), {
            initialProps: { src: 'first.png' },
        });

        await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1), { timeout: 4000 });

        mockFetchOk(makePngBlob());
        rerender({ src: 'second.png' });

        await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2), { timeout: 4000 });
    });

    // ── Cleanup ────────────────────────────────────────────────────────────────

    it('revokes the blob URL on unmount', async () => {
        mockFetchOk(makePngBlob());
        const { unmount } = renderHook(() => useImageOptimizer('cleanup.png', 80));

        await waitFor(
            () => expect(URL.createObjectURL).toHaveBeenCalled(),
            { timeout: 4000 }
        );

        unmount();
        expect(URL.revokeObjectURL).toHaveBeenCalled();
    });
});
