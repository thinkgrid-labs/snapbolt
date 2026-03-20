import type { NextRequest, NextResponse } from 'next/server';

/**
 * Next.js App Router GET handler for on-demand image optimization.
 *
 * Requires `@thinkgrid/snapbolt-cli` to be installed.
 *
 * @example
 * // app/api/image/route.ts
 * export { GET } from '@thinkgrid/snapbolt/handler';
 */
export declare function GET(request: NextRequest): Promise<NextResponse>;
