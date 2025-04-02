// backend/src/app/api/notifications/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
    return NextResponse.json({ status: 'Notifications API is coming soon' });
}