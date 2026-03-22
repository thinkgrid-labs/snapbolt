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

// Mock Image to auto-fire onload when src is set (jsdom doesn't load blob: URLs).
class MockImage {
    width = 100;
    height = 100;
    onload: (() => void) | null = null;
    onerror: ((e: Event) => void) | null = null;
    private _src = '';
    set src(val: string) {
        this._src = val;
        if (val) setTimeout(() => this.onload?.(), 0);
    }
    get src() { return this._src; }
}
vi.stubGlobal('Image', MockImage);

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
    beforeEach(() => {
        vi.clearAllMocks();
        (fetch as ReturnType<typeof vi.fn>).mockReset();

        // Mock canvas.getContext to return a minimal 2D context.
        vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
            drawImage: vi.fn(),
        } as unknown as CanvasRenderingContext2D);

        // Mock canvas.toBlob to synchronously return a WebP blob.
        vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (cb: BlobCallback) {
            cb(new Blob(['webp'], { type: 'image/webp' }));
        });
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

    it('accepts options as an object (quality + format)', async () => {
        mockFetchOk(makePngBlob());
        const { result } = renderHook(() =>
            useImageOptimizer('photo.png', { quality: 60, format: 'webp' })
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

    it('encodes via canvas WebP (not WASM)', async () => {
        mockFetchOk(makePngBlob());
        const { result } = renderHook(() => useImageOptimizer('photo.png', 80));

        await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 4000 });
        expect(HTMLCanvasElement.prototype.toBlob).toHaveBeenCalledWith(
            expect.any(Function),
            'image/webp',
            expect.any(Number),
        );
        expect(result.current.optimizedUrl).toBe('blob:mock-url');
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
        // Override toBlob to simulate canvas failure for this test
        vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (cb: BlobCallback) {
            cb(null);
        });

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
