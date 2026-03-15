'use client';

import { SnapboltProvider } from '@think-grid-labs/snapbolt';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SnapboltProvider
      serverUrl={process.env.NEXT_PUBLIC_SNAPBOLT_SERVER_URL ?? '/api'}
      defaultQuality={80}
      defaultFormat="auto"
      breakpoints={[640, 1080, 1920]}
    >
      {children}
    </SnapboltProvider>
  );
}
