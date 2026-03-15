'use client';

import React, { createContext, useContext } from 'react';

export interface SnapboltConfig {
    /**
     * Base URL of a running snapbolt-server instance.
     * When set, SmartImage routes requests through the server (best for LCP/Lighthouse).
     * When absent, SmartImage falls back to client-side WASM processing.
     *
     * @example 'http://localhost:3000'
     * @example 'https://images.yourapp.com'
     */
    serverUrl?: string;

    /** Default quality applied to all SmartImage instances (1–100). @default 80 */
    defaultQuality?: number;

    /** Default output format for all SmartImage instances. @default 'auto' */
    defaultFormat?: 'webp' | 'jpeg' | 'png' | 'auto';

    /**
     * Widths (px) used to generate the srcset.
     * The browser picks the best size for the viewport automatically.
     * @default [640, 1080, 1920]
     */
    breakpoints?: number[];
}

const SnapboltContext = createContext<SnapboltConfig>({});

/**
 * Wrap your app (or a subtree) with SnapboltProvider to configure SmartImage globally.
 *
 * @example
 * // app/layout.tsx
 * import { SnapboltProvider } from '@think-grid-labs/snapbolt';
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <SnapboltProvider serverUrl="https://images.yourapp.com" defaultQuality={80}>
 *       {children}
 *     </SnapboltProvider>
 *   );
 * }
 */
export function SnapboltProvider({
    children,
    serverUrl,
    defaultQuality,
    defaultFormat,
    breakpoints,
}: SnapboltConfig & { children: React.ReactNode }) {
    return (
        <SnapboltContext.Provider value={{ serverUrl, defaultQuality, defaultFormat, breakpoints }}>
            {children}
        </SnapboltContext.Provider>
    );
}

export function useSnapboltConfig(): SnapboltConfig {
    return useContext(SnapboltContext);
}
