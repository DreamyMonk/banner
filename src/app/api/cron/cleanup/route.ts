// /src/app/api/cron/cleanup/route.ts
import { cleanupExpiredBanners } from '@/app/actions';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const result = await cleanupExpiredBanners();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Cron job failed:', error);
    return NextResponse.json({ success: false, error: 'Cleanup failed' }, { status: 500 });
  }
}
