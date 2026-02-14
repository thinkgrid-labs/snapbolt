import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useImageOptimizer } from './index';

// Mock the Wasm module import
vi.mock('@think-grid-labs/opti-assets-browser', () => ({
    optimize_image_sync: vi.fn((bytes: Uint8Array) => {
        // Return a dummy optimized buffer (just reverse input for testing)
        return new Uint8Array(bytes.reverse());
    }),
}));

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

describe('useImageOptimizer', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Mock global fetch
        global.fetch = vi.fn(() =>
            Promise.resolve({
                ok: true,
                blob: () => Promise.resolve(new Blob(['mock-image-data'])),
            } as Response)
        );
    });

    it('should initialize with default state', () => {
        const { result } = renderHook(() => useImageOptimizer(''));
        expect(result.current).toEqual({
            optimizedUrl: null,
            loading: false,
            error: null,
        });
    });

    it('should optimize an image URL successfully', async () => {
        const { result } = renderHook(() => useImageOptimizer('https://example.com/image.jpg'));

        // Should be loading initially
        // Note: strictly testing loading=true is hard with async effects in renderHook 
        // without waiting, but we can check the final state.

        await waitFor(() => {
            expect(result.current.optimizedUrl).toBe('blob:mock-url');
        });

        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBe(null);
        expect(global.fetch).toHaveBeenCalledWith('https://example.com/image.jpg');
    });

    it('should handle fetch errors', async () => {
        // Mock fetch failure
        global.fetch = vi.fn(() => Promise.reject(new Error('Network error')));

        const { result } = renderHook(() => useImageOptimizer('https://example.com/bad.jpg'));

        await waitFor(() => {
            expect(result.current.error).toBe('Network error');
        });

        expect(result.current.loading).toBe(false);
        expect(result.current.optimizedUrl).toBe(null);
    });
});
