/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { SmartImage } from './SmartImage';
import { SnapboltProvider } from './context';
import type { UseImageOptimizerResult } from './useImageOptimizer';

// Mock WASM-mode hook so WASM mode tests control state explicitly
vi.mock('./useImageOptimizer', () => ({
    useImageOptimizer: vi.fn((): UseImageOptimizerResult => ({
        optimizedUrl: null,
        loading: true,
        error: null,
    })),
}));

// ── Helpers ────────────────────────────────────────────────────────────────────

const SERVER_URL = 'https://img.test';
const SRC = 'https://cdn.example.com/photo.jpg';

function withProvider(serverUrl?: string) {
    return ({ children }: { children: React.ReactNode }) => (
        <SnapboltProvider serverUrl={serverUrl}>{children}</SnapboltProvider>
    );
}

// ── Server mode tests ──────────────────────────────────────────────────────────

describe('SmartImage — server mode', () => {
    afterEach(() => {
        // Remove any <link> tags injected by priority images
        document.head.querySelectorAll('link[rel="preload"]').forEach(el => el.remove());
    });

    it('renders an <img> whose src routes through the server', () => {
        render(
            <SmartImage src={SRC} alt="test" width={800} />,
            { wrapper: withProvider(SERVER_URL) }
        );
        const img = screen.getByAltText('test') as HTMLImageElement;
        expect(img.src).toContain('url=');
        expect(img.src).toContain(encodeURIComponent(SRC));
        expect(img.src).toContain(SERVER_URL.replace('https:', 'https:'));
    });

    it('includes all default breakpoints in srcset', () => {
        render(
            <SmartImage src={SRC} alt="test" />,
            { wrapper: withProvider(SERVER_URL) }
        );
        const img = screen.getByAltText('test') as HTMLImageElement;
        expect(img.srcset).toContain('640w');
        expect(img.srcset).toContain('1080w');
        expect(img.srcset).toContain('1920w');
    });

    it('respects custom breakpoints', () => {
        render(
            <SmartImage src={SRC} alt="test" breakpoints={[320, 768]} />,
            { wrapper: withProvider(SERVER_URL) }
        );
        const img = screen.getByAltText('test') as HTMLImageElement;
        expect(img.srcset).toContain('320w');
        expect(img.srcset).toContain('768w');
        expect(img.srcset).not.toContain('1920w');
    });

    it('defaults sizes to 100vw', () => {
        render(
            <SmartImage src={SRC} alt="test" />,
            { wrapper: withProvider(SERVER_URL) }
        );
        expect((screen.getByAltText('test') as HTMLImageElement).sizes).toBe('100vw');
    });

    it('passes a custom sizes attribute through', () => {
        render(
            <SmartImage src={SRC} alt="test" sizes="(max-width: 768px) 100vw, 50vw" />,
            { wrapper: withProvider(SERVER_URL) }
        );
        expect((screen.getByAltText('test') as HTMLImageElement).sizes).toBe(
            '(max-width: 768px) 100vw, 50vw'
        );
    });

    it('priority: sets loading=eager and fetchpriority=high', () => {
        render(
            <SmartImage src={SRC} alt="test" priority />,
            { wrapper: withProvider(SERVER_URL) }
        );
        const img = screen.getByAltText('test') as HTMLImageElement;
        expect(img.getAttribute('loading')).toBe('eager');
        expect(img.getAttribute('fetchpriority')).toBe('high');
    });

    it('non-priority image defaults to loading=lazy', () => {
        render(
            <SmartImage src={SRC} alt="test" />,
            { wrapper: withProvider(SERVER_URL) }
        );
        expect((screen.getByAltText('test') as HTMLImageElement).getAttribute('loading')).toBe('lazy');
    });

    it('priority: injects a <link rel="preload"> into document.head', async () => {
        render(
            <SmartImage src={SRC} alt="test" priority />,
            { wrapper: withProvider(SERVER_URL) }
        );
        await waitFor(() => {
            const link = document.head.querySelector('link[rel="preload"]');
            expect(link).not.toBeNull();
            // Component uses imagesrcset-based preload (no `as` attr needed for srcset preloads)
            expect(link?.getAttribute('imagesrcset') ?? link?.getAttribute('href')).toBeTruthy();
        });
    });

    it('passes width and height attributes to the img element', () => {
        render(
            <SmartImage src={SRC} alt="test" width={600} height={400} />,
            { wrapper: withProvider(SERVER_URL) }
        );
        const img = screen.getByAltText('test') as HTMLImageElement;
        expect(img.width).toBe(600);
        expect(img.height).toBe(400);
    });

    it('fill: applies position:absolute and object-fit:cover to the img', () => {
        render(
            <div style={{ position: 'relative', height: 400 }}>
                <SmartImage src={SRC} alt="fill-test" fill />
            </div>,
            { wrapper: withProvider(SERVER_URL) }
        );
        const img = screen.getByAltText('fill-test') as HTMLImageElement;
        expect(img.style.position).toBe('absolute');
        expect(img.style.objectFit).toBe('cover');
    });

    it('blur placeholder: renders an aria-hidden overlay before load', () => {
        render(
            <SmartImage
                src={SRC}
                alt="test"
                placeholder="blur"
                blurDataURL="data:image/jpeg;base64,abc"
            />,
            { wrapper: withProvider(SERVER_URL) }
        );
        const blurImg = document.querySelector('img[aria-hidden="true"]') as HTMLImageElement;
        expect(blurImg).not.toBeNull();
        expect(blurImg.style.opacity).toBe('1');
    });

    it('blur placeholder: fades out overlay after main image loads', async () => {
        render(
            <SmartImage
                src={SRC}
                alt="test"
                placeholder="blur"
                blurDataURL="data:image/jpeg;base64,abc"
            />,
            { wrapper: withProvider(SERVER_URL) }
        );
        const mainImg = screen.getByAltText('test') as HTMLImageElement;
        fireEvent.load(mainImg);

        await waitFor(() => {
            expect(mainImg.style.opacity).toBe('1');
        });

        const blurImg = document.querySelector('img[aria-hidden="true"]') as HTMLImageElement;
        expect(blurImg.style.opacity).toBe('0');
    });

    it('per-image serverUrl overrides the provider serverUrl', () => {
        render(
            <SmartImage src={SRC} alt="test" serverUrl="https://custom.img" />,
            { wrapper: withProvider(SERVER_URL) }
        );
        const img = screen.getByAltText('test') as HTMLImageElement;
        expect(img.src).toContain('custom.img');
        expect(img.src).not.toContain('img.test');
    });
});

// ── WASM mode tests ────────────────────────────────────────────────────────────

describe('SmartImage — WASM mode (no serverUrl)', () => {
    beforeEach(async () => {
        const { useImageOptimizer } = vi.mocked(
            await import('./useImageOptimizer')
        );
        useImageOptimizer.mockReturnValue({ optimizedUrl: null, loading: true, error: null });
    });

    it('shows shimmer while loading', () => {
        render(
            <SmartImage src={SRC} alt="wasm-test" />,
            { wrapper: withProvider(undefined) }
        );
        expect(screen.queryByAltText('wasm-test')).toBeNull();
        // Shimmer span present
        expect(document.querySelector('span[style]')).not.toBeNull();
    });

    it('renders img once optimizedUrl is available', async () => {
        const { useImageOptimizer } = await import('./useImageOptimizer');
        vi.mocked(useImageOptimizer).mockReturnValue({
            optimizedUrl: 'blob:wasm-result',
            loading: false,
            error: null,
        });

        render(
            <SmartImage src={SRC} alt="wasm-test" />,
            { wrapper: withProvider(undefined) }
        );

        const img = screen.getByAltText('wasm-test') as HTMLImageElement;
        expect(img.src).toContain('blob:wasm-result');
    });

    it('uses WASM mode when src is a Blob regardless of serverUrl', async () => {
        const { useImageOptimizer } = await import('./useImageOptimizer');
        vi.mocked(useImageOptimizer).mockReturnValue({
            optimizedUrl: 'blob:from-wasm',
            loading: false,
            error: null,
        });

        const blob = new Blob(['bytes'], { type: 'image/png' });
        render(
            <SmartImage src={blob} alt="blob-test" />,
            { wrapper: withProvider(SERVER_URL) } // serverUrl set but src is Blob → WASM
        );

        const img = screen.getByAltText('blob-test') as HTMLImageElement;
        expect(img.src).toContain('blob:from-wasm');
    });
});
