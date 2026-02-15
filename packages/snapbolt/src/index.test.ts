/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useImageOptimizer } from './index';

// Mock Fetch
global.fetch = vi.fn();

// Mock URL.createObjectURL/revokeObjectURL
if (typeof window !== 'undefined') {
    window.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    window.URL.revokeObjectURL = vi.fn();
}

// Mock the Wasm Module import
vi.mock('../pkg/snapbolt.js', () => ({
    init: vi.fn().mockResolvedValue({}),
    optimize_image_sync: vi.fn().mockReturnValue(new Uint8Array([1, 2, 3])),
}));

describe('useImageOptimizer', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (global.fetch as any).mockReset();
    });

    it('should optimize image smoothly', async () => {
        const mockBlob = new Blob(['test'], { type: 'image/png' });
        mockBlob.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(4));

        (global.fetch as any).mockResolvedValue({
            ok: true,
            blob: () => Promise.resolve(mockBlob),
        });

        const { result } = renderHook(() => useImageOptimizer('test.png', 80));

        await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 4000 });
        expect(result.current.optimizedUrl).toBe('blob:mock-url');
        expect(result.current.error).toBeNull();
    });

    it('should handle fetch errors', async () => {
        (global.fetch as any).mockResolvedValue({
            ok: false,
            statusText: 'Not Found',
        });

        const { result } = renderHook(() => useImageOptimizer('invalid.png', 80));

        await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 4000 });
        expect(result.current.error).toContain('Failed to fetch image');
        expect(result.current.optimizedUrl).toBeNull();
    });

    it('should cleanup on unmount', async () => {
        const mockBlob = new Blob(['test'], { type: 'image/png' });
        mockBlob.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(4));

        (global.fetch as any).mockResolvedValue({
            ok: true,
            blob: () => Promise.resolve(mockBlob),
        });

        const { unmount } = renderHook(() => useImageOptimizer('cleanup.png', 80));

        await waitFor(() => expect(window.URL.createObjectURL).toHaveBeenCalled(), { timeout: 3000 });

        unmount();
        expect(window.URL.revokeObjectURL).toHaveBeenCalled();
    });
});
