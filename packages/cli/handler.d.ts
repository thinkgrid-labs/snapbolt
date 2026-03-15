import type { NextRequest, NextResponse } from 'next/server';

/**
 * Next.js App Router GET handler for on-demand image optimization.
 *
 * @example
 * // app/api/image/route.ts
 * export { GET } from '@think-grid-labs/snapbolt-cli/handler';
 */
export declare function GET(request: NextRequest): Promise<NextResponse>;
