import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
    return NextResponse.json({ status: 'Auth API is working' });
}

export async function POST(request: NextRequest) {
    try {
        const { email, password, action } = await request.json();

        if (!email || !action) {
            return NextResponse.json(
                { error: 'Email and action are required' },
                { status: 400 }
            );
        }

        let result;

        switch (action) {
            case 'signUp':
                if (!password) {
                    return NextResponse.json(
                        { error: 'Password is required for sign up' },
                        { status: 400 }
                    );
                }
                result = await supabase.auth.signUp({
                    email,
                    password,
                });
                break;

            case 'signIn':
                if (!password) {
                    return NextResponse.json(
                        { error: 'Password is required for sign in' },
                        { status: 400 }
                    );
                }
                result = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                break;

            case 'resetPassword':
                result = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: `${request.nextUrl.origin}/reset-password`,
                });
                break;

            default:
                return NextResponse.json(
                    { error: 'Invalid action' },
                    { status: 400 }
                );
        }

        if (result.error) {
            return NextResponse.json(
                { error: result.error.message },
                { status: 400 }
            );
        }

        return NextResponse.json(result.data);
    } catch (error) {
        console.error('Auth API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}