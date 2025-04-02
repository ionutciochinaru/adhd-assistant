// backend/src/app/api/payments/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
    return NextResponse.json({ status: 'Payments API is coming soon' });
}