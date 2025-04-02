// backend/src/app/api/calendar/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
    return NextResponse.json({ status: 'Calendar API is coming soon' });
}