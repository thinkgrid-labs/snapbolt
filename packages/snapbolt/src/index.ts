// Hook (primary client-side WASM optimizer)
export { useImageOptimizer } from './useImageOptimizer';
export type { ImageOptimizerOptions, UseImageOptimizerResult } from './useImageOptimizer';

export type OutputFormat = 'webp' | 'avif' | 'jpeg' | 'png';

// SmartImage component + provider
export { SmartImage, default } from './SmartImage';
export type { SmartImageProps } from './SmartImage';

export { SnapboltProvider, useSnapboltConfig } from './context';
export type { SnapboltConfig } from './context';
