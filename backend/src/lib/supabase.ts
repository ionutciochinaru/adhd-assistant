import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    console.error('Missing Supabase environment variables. Please check your .env file:', {
        url: !!supabaseUrl ? 'OK' : 'MISSING',
        anonKey: !!supabaseAnonKey ? 'OK' : 'MISSING',
        serviceKey: !!supabaseServiceRoleKey ? 'OK' : 'MISSING',
    });

    if (process.env.NODE_ENV === 'development') {
        throw new Error('Missing required Supabase environment variables');
    }
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
    },
    global: {
        headers: {
            'Content-Type': 'application/json',
        },
    },
});

export const supabaseAdmin = createClient(supabaseUrl || '', supabaseServiceRoleKey || '', {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
    },
    global: {
        headers: {
            'Content-Type': 'application/json',
        },
    },
});

export type User = {
    id: string;
    email: string;
    created_at: string;
    name: string | null;
    avatar_url: string | null;
    notification_preferences: Record<string, any>;
};

export type Task = {
    id: string;
    user_id: string;
    title: string;
    description: string | null;
    priority: 'low' | 'medium' | 'high';
    status: 'active' | 'completed';
    due_date: string | null;
    created_at: string;
    completed_at: string | null;
    subtasks?: Subtask[];
};

export type Subtask = {
    id: string;
    task_id: string;
    title: string;
    status: 'active' | 'completed';
    created_at: string;
    completed_at: string | null;
};

export type Medication = {
    id: string;
    user_id: string;
    name: string;
    dosage: string | null;
    frequency: string | null;
    time_of_day: string[];
    notes: string | null;
    created_at: string;
    active: boolean;
};

export type MedicationLog = {
    id: string;
    user_id: string;
    medication_id: string;
    taken_at: string;
    taken: boolean;
    notes: string | null;
};

export type MoodJournal = {
    id: string;
    user_id: string;
    date: string;
    mood_rating: number;
    focus_rating: number;
    energy_rating: number;
    sleep_quality: number;
    symptoms: string[];
    notes: string | null;
    created_at: string;
};